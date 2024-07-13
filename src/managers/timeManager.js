const getIndianTime = () => {
    return getTime(new Date());
}
const getTime = (date) => {

    const options = {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    };

    const indianDateTimeFormatter = new Intl.DateTimeFormat('en-IN', options);
    return indianDateTimeFormatter.format(date);
}

function getGreeting() {
    // Extract components from the date string
    const [, day, month, year, time, period] = getIndianTime().match(/(\d+)\/(\d+)\/(\d+),\s*([0-9:\s]+)\s*([aApP][mM])/);

    // Create a Date object with the extracted components
    const date = new Date(`${month}/${day}/${year} ${time} ${period.toUpperCase()}`);

    // Get the hour component from the date
    const hours = date.getHours();

    let greeting;

    if (hours >= 5 && hours < 12) {
        greeting = 'Morning';
    } else if (hours >= 12 && hours < 17) {
        greeting = 'Afternoon';
    } else if (hours >= 17 && hours < 20) {
        greeting = 'Evening';
    } else {
        greeting = 'Night';
    }

    return greeting;
}

module.exports = {
    getIndianTime, getGreeting
}