import React from 'react';

const PomodoroClock = ({ minutes, seconds, mode, topic }) => {
    const formatTime = (time) => time < 10 ? `0${time}` : time;

    return (
        <div className="flex flex-col items-center justify-center p-10 rounded-full aspect-square w-80 h-80 md:w-96 md:h-96 border-8 border-gray-700" style={{backgroundColor: '#386641'}}>
            <div className="text-lg font-semibold mb-2">{mode}</div>
            <div className="text-6xl md:text-7xl font-bold tracking-wider">
                {formatTime(minutes)}:{formatTime(seconds)}
            </div>
            {mode === 'Study' && <div className="text-xl mt-4">{topic}</div>}
        </div>
    );
};

export default PomodoroClock;
