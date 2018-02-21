function dbVendorModule($imports) {
	const {utils, db} = $imports;
	const {eventEmitter, snapshotToArray, onSubtreeIdListUpdate} = utils;
	const subTree = process.env.NODE_ENV;

	eventEmitter.on("db/vendor:finalizeVendors", vendorConfirmationPipeline);

	function vendorConfirmationPipeline(eventData) {
		appendProdSkusToBookings(eventData.payload)
		.then(({SKUMap, booking})=> {
			db.ref(`${subTree}/bookings/${booking.id}/vendors/`)
			.set(Object.keys(SKUMap));
		});
		return eventData.payload;
	};

	function checkVendorProducts(SKUMap, sku, vendor) {
		if (vendor.products.includes(sku)) {
			SKUMap[vendor.id][sku] ? SKUMap[vendor.id][sku]++ : SKUMap[vendor.id][sku] = 1;
		}
	};

	function pushSKUList(SKUMap, booking, key) {
		return db.ref(`${subTree}/vendors/${key}/bookings/${booking.id}`)
		.update(SKUMap[key])
	};

	function appendProdSkusToBookings(booking) {
		const productSKUMap = {};
		return db.ref(`${subTree}/vendors`).once("value")
		.then((snapshot)=> {
			const vendorList = snapshotToArray(snapshot);
			const vendorMap = vendorList
			.reduce((obj, vendor)=> {
				obj[vendor.id] = {};	
				return obj;
			}, {});

			return booking.products
			.reduce((SKUMap, currentSKU)=> {
				vendorList.forEach(checkVendorProducts.bind(null, 
					SKUMap,
					currentSKU)
				);
				return SKUMap;
			}, vendorMap);
		})
		.then((SKUMap)=> {
			const allSKUs = Object.keys(SKUMap)
			.map(pushSKUList.bind(
				null, 
				SKUMap,
				booking)
			);

			return Promise.all(allSKUs).then(()=> {
				return { SKUMap, booking }
			});
		});
	};
};

module.exports = dbVendorModule;
