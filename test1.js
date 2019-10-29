function availableTimes(schedule) {
  let nextAvailStartTime = 540;
  let nextAvailEndTime = null;
  const closeTime = 720;
  let availTimes = [];
  schedule.map((booking,i) => {
    if(booking.startTime > nextAvailStartTime) {
      nextAvailEndTime = booking.startTime;
      availTimes.push({startTime: nextAvailStartTime, endTime: nextAvailEndTime});
    }
    // if the current booking finish time is later than the previously assumed available time, 
    // then we move our next available time to the current finish booking time
    if (booking.endTime > nextAvailStartTime) {
      nextAvailStartTime = booking.endTime;
    }
    //if this is a last booking
    if(i === schedule.length - 1 && closeTime > booking.endTime){
      nextAvailStartTime = booking.endTime;
      nextAvailEndTime  = closeTime;
      availTimes.push({startTime: nextAvailStartTime, endTime: nextAvailEndTime});
    }
  })
  return availTimes
}


console.log(availableTimes([{ startTime: 560, endTime: 580}, {startTime: 570, endTime: 590},{startTime: 580, endTime: 590},{startTime: 600, endTime: 630}, {startTime: 700, endTime: 715} ]));
