function databaseWrapper($imports) {
	const {utils, db} = $imports;
	const eventEmitter = utils.eventEmitter;
	const subTree = process.env.NODE_ENV;


	function onPushBookingData(booking, ref) {
		return db.ref(`${subTree}/bookings`).push(booking.bookingData)
		.then((ref)=> {
			booking.bookingCreationDate = new Date().getTime();
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
			.then(()=> bookingId);
		}).catch(onError);
	};

	function onError(error) {
		console.error(error);
		return {
			code: "booking/error", 
			msg: error.message, 
			stack: error.stack.split("\n")
		};
	};

	eventEmitter.on("db:createBooking", (booking)=> {
		return onPushBookingData(booking) 
		.then(appendRecipientIdToBooking.bind(null, booking))
		.catch(onError);
	});

}

module.exports = databaseWrapper;
