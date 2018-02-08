function dbBookingModule($imports) {
	const {utils, db, auth} = $imports;
	const snapshotToArray = utils.snapshotToArray;
	const eventEmitter = utils.eventEmitter;
	const onSubtreeIdListUpdate = utils.onSubtreeIdListUpdate;
	const subTree = process.env.NODE_ENV;

	function onPushBookingData(booking, ref) {
		booking.bookingData.bookingCreationDate = new Date().getTime();
		booking.bookingData.bookingRefNumber =  Math.floor(Math.random() * 90000) + 10000;
		return db.ref(`${subTree}/bookings`).push(booking.bookingData)
		.then((ref)=> {
			booking.recipientData.bookings.push(ref.key);
			return ref.key;
		}).catch(onError);
	};

	function appendRecipientIdToBooking(booking, id) {
		const bookingId = id;
		return db.ref(`${subTree}/recipients`).push(booking.recipientData)
		.then((ref)=> {
			return db.ref(`${subTree}/bookings/${bookingId}`)
			.update({recipientId: ref.key})
			.then(()=> {
				return db.ref(`${subTree}/meta`)
				.update({[ref.key]: {entity: "recipient"}});
			})
			.then(()=> { return {booking,bookingId}});
		}).catch(onError);
	};

	function appendBookingIdToCustomer({booking, bookingId}) {
	/* MAKE DRY: SAME AS appendBookingIdToAccountManager*/
		const customerId = booking.bookingData.customerId;
		const customerRef = db.ref(`${subTree}/customers/${customerId}/bookings`);
		db.ref(`${subTree}/meta`).update({
			[customerId]: {entity: "customer"}
		});
		return customerRef.once("value")
		.then(onSubtreeIdListUpdate.bind(null, customerRef, bookingId))
		.then(()=> { return {bookingId, booking}});
	}

	function appendBookingIdToAccountManager({booking, bookingId}) {
	/* MAKE DRY: SAME AS appendBookingIdToCustomer */
		const accountManagerRef = db.ref(`${subTree}/accountManagers/${booking.bookingData.accountManagerId}/bookingsPending`);

		return accountManagerRef.once("value")
		.then(onSubtreeIdListUpdate.bind(null, accountManagerRef, bookingId))
		.then(()=> { return {booking, bookingId}});
	};

	function onError(error) {
		console.error(error);
		return {
			code: "databaseWrapper/error", 
			msg: error.message, 
			stack: error.stack.split("\n")
		};
	};

	function onFindUser(talentPhone, user) {
		return user.phoneNumber === talentPhone;
	}

	function findingPendingBooking(data, booking){
		return booking.bookingRefNumber === data.bookingRefNumber && booking.status === "PENDING";
	}

	eventEmitter.on("db/booking:createBooking", (booking)=> {
		return onPushBookingData(booking) 
		.then(appendRecipientIdToBooking.bind(null, booking))
		.then(appendBookingIdToAccountManager)
		.then(appendBookingIdToCustomer)
		.catch(onError);
	});

	eventEmitter.on("db/booking:finalizeBooking", (data)=> {
		/*payment happens during this phase*/
		return auth.listUsers().then((list)=> {
			const talentId = list.users.find(onFindUser.bind(null, data.talentPhoneNumber)).toJSON().uid;
			const bookingsRef = db.ref(`${subTree}/bookings`);

			return bookingsRef.orderByChild("bookingRefNumber")
			.once("value")
			.then((snapshot)=> {
				return snapshotToArray(snapshot)
				.find(findingPendingBooking.bind(null, data));
			})
			.then((booking)=> {
				bookingsRef.child(`${booking.id}`).update({
					status: "CONFIRMED",
					paymentStatus: "CHARGED",
					talentId
				});
				const talentRef = db.ref(`${subTree}/talent`)
				.child(`${talentId}/bookings`)

				return talentRef.once("value")
				.then(onSubtreeIdListUpdate.bind(null, talentRef, booking.id))
				.then(()=> {return booking});
			})
			.catch((error)=> console.log(error))
		});
	});

}

module.exports = dbBookingModule;
