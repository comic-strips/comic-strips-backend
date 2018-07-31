function talentPipelineModule($imports) {
  const {db, eventEmitter} = $imports;

  eventEmitter.on("inbound_bookreq_acknowledged", onNotifyTalent);
 
  function onNotifyTalent(booking) {
    return db.collection("talent").find().then((talentList)=> {
        eventEmitter.emit("outbound_talent_request", {
          talentList: talentList.filter(onAvailable),
          booking
        });
      return booking;
    });
  }

  function onAvailable(talent) {
    //TODO: Build talent selection alogrithm
    return talent;
  } 

  function onUpdateBookingStatus() {
    
  }

  function onError(e) {
    console.error(e);
  }

  return {onNotifyTalent};
}

module.exports = talentPipelineModule;