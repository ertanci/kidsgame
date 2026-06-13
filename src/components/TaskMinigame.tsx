import React, { useState, useEffect } from 'react';
import { Book, Soup, Clock as ClockIcon, Sliders, Flower2, Box, X, Check, Award } from 'lucide-react';

interface TaskMinigameProps {
  taskId: string;
  taskName: string;
  taskType: 'books' | 'salad' | 'clock' | 'flowers' | 'toybox';
  onProgress: (increment: number) => void;
  onClose: () => void;
}

export default function TaskMinigame({ taskId, taskName, taskType, onProgress, onClose }: TaskMinigameProps) {
  const [success, setSuccess] = useState(false);

  // Puzzle 1: Sort the Books (Click in numerical order)
  const [books, setBooks] = useState<number[]>([]);
  const [booksSolvedCount, setBooksSolvedCount] = useState(0);

  // Helper to generate 5 random multi-digit numbers for 10-year-olds
  const generateRandomBooks = () => {
    const list: number[] = [];
    while (list.length < 5) {
      // Numbers like 399, 122, 500, or 4-digit numbers like 1121, etc.
      // Mix of 3-digit and 2-to-4-digit numbers: range 100 to 9999
      const num = Math.floor(Math.random() * 9800) + 100;
      if (!list.includes(num)) {
        list.push(num);
      }
    }
    return list;
  };

  // Puzzle 2: Mix Fruit Salad (Click ingredients as they are requested)
  const ingredients = ['🍌 Banana', '🍎 Apple', '🍊 Orange', '🍓 Strawberry'];
  const [targetIngredient, setTargetIngredient] = useState('');
  const [saladSteps, setSaladSteps] = useState(0);

  // Puzzle 3: Repair Vintage Clock (Hold button to align hand to target hour)
  const [clockHour, setClockHour] = useState(1);
  const [targetHour, setTargetHour] = useState(6);

  // Puzzle 4: Water the Flowers (Hold mouse/touch to fill water progress)
  const [flowerWater, setFlowerWater] = useState(0);
  const [isWatering, setIsWatering] = useState(false);

  // Puzzle 5: Tidy Toy Box (Match colored toys to their geometric slots)
  const shapes = ['🟡 Circle', '⭐ Star', '🟦 Square'];
  const [toyShape, setToyShape] = useState('');
  const [toyBoxTarget, setToyBoxTarget] = useState('');
  const [toysPlaced, setToysPlaced] = useState(0);

  // Initializers
  useEffect(() => {
    if (taskType === 'books') {
      setBooks(generateRandomBooks());
      setBooksSolvedCount(0);
    } else if (taskType === 'salad') {
      chooseNextIngredient();
      setSaladSteps(0);
    } else if (taskType === 'clock') {
      setClockHour(1);
      setTargetHour(Math.floor(Math.random() * 11) + 2); // Random hour between 2 and 12
    } else if (taskType === 'flowers') {
      setFlowerWater(0);
    } else if (taskType === 'toybox') {
      generateToyMatching();
      setToysPlaced(0);
    }
  }, [taskType]);

  // Puzzle helper functions
  const chooseNextIngredient = () => {
    const randomIng = ingredients[Math.floor(Math.random() * ingredients.length)];
    setTargetIngredient(randomIng);
  };

  const handleBookClick = (num: number) => {
    const sorted = [...books].sort((a, b) => a - b);
    if (num === sorted[booksSolvedCount]) {
      const nextSolved = booksSolvedCount + 1;
      setBooksSolvedCount(nextSolved);
      onProgress(20);
      if (nextSolved >= 5) {
        completeTask();
      }
    } else {
      // Bad sequence, reset books order with a brief visual shake
      setBooks(generateRandomBooks());
      setBooksSolvedCount(0);
    }
  };

  const handleSaladClick = (ing: string) => {
    if (ing === targetIngredient) {
      const nextCount = saladSteps + 1;
      setSaladSteps(nextCount);
      onProgress(25);
      if (nextCount >= 4) {
        completeTask();
      } else {
        chooseNextIngredient();
      }
    }
  };

  const adjustClock = (dir: 'up' | 'down') => {
    setClockHour(prev => {
      let next = dir === 'up' ? prev + 1 : prev - 1;
      if (next > 12) next = 1;
      if (next < 1) next = 12;

      // Checking accuracy trigger
      if (next === targetHour) {
        onProgress(100);
        completeTask();
      }
      return next;
    });
  };

  // Water can flower watering ticker
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isWatering && taskType === 'flowers' && !success) {
      interval = setInterval(() => {
        setFlowerWater(prev => {
          const next = prev + 5;
          onProgress(5);
          if (next >= 100) {
            clearInterval(interval);
            completeTask();
            return 100;
          }
          return next;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isWatering, taskType, success]);

  const generateToyMatching = () => {
    const randomShape = shapes[Math.floor(Math.random() * shapes.length)];
    setToyShape(randomShape);
    setToyBoxTarget(shapes[Math.floor(Math.random() * shapes.length)]);
  };

  const handleToyDrop = (isMatched: boolean) => {
    if (isMatched) {
      const nextPlaced = toysPlaced + 1;
      setToysPlaced(nextPlaced);
      onProgress(33.4);
      if (nextPlaced >= 3) {
        completeTask();
      } else {
        generateToyMatching();
      }
    } else {
      // Re-trigger shapes if incorrect placement
      generateToyMatching();
    }
  };

  const completeTask = () => {
    setSuccess(true);
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <div id="minigame_root" className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 p-4">
      <div className="w-full max-w-md bg-slate-900 border-2 border-amber-400 rounded-3xl p-6 shadow-2xl relative flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            {taskType === 'books' && <Book className="text-amber-400" />}
            {taskType === 'salad' && <Soup className="text-amber-400" />}
            {taskType === 'clock' && <ClockIcon className="text-amber-400" />}
            {taskType === 'flowers' && <Flower2 className="text-amber-400" />}
            {taskType === 'toybox' && <Box className="text-amber-400" />}
            <h3 className="text-xl font-bold text-amber-200 tracking-wide">{taskName}</h3>
          </div>
          <button 
            id="close_minigame_btn"
            onClick={onClose}
            className="p-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Success Splash overlay */}
        {success ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 animate-bounce">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30 mb-4">
              <Award size={44} className="text-white" />
            </div>
            <p className="text-green-400 text-2xl font-bold tracking-wider">HARİKA! TAMAMLANDI</p>
            <p className="text-slate-400 text-sm mt-1">Mansion progress bar is ticking up!</p>
          </div>
        ) : (
          <div className="flex-1 py-4 flex flex-col justify-between">
            {/* PUZZLE 1: Books sequence */}
            {taskType === 'books' && (() => {
              const sorted = [...books].sort((a, b) => a - b);
              const nextTarget = sorted[booksSolvedCount];
              return (
                <div className="flex flex-col items-center my-6">
                  <p className="text-slate-300 text-xs sm:text-sm text-center mb-6">
                    Sayıları <strong className="text-amber-400 font-bold">küçükten büyüğe</strong> doğru sırala!
                  </p>
                  <div className="flex gap-1.5 justify-center w-full overflow-x-auto py-2">
                    {books.map((num, i) => {
                      const isDone = sorted.slice(0, booksSolvedCount).includes(num);
                      return (
                        <button
                          key={i}
                          id={`book_${num}`}
                          onClick={() => handleBookClick(num)}
                          className={`w-15 h-36 rounded-xl flex flex-col justify-between p-1.5 font-mono font-black text-xs sm:text-xs transition-all shadow-md transform active:scale-95 border-x border-t ${
                            isDone 
                              ? 'bg-emerald-700/80 border-emerald-500 text-emerald-250 opacity-40 cursor-default'
                              : 'bg-indigo-650 hover:bg-indigo-600 text-indigo-50 border-indigo-500 border-b-8 shadow-indigo-950/40'
                          }`}
                          disabled={isDone}
                        >
                          <div className="text-[10px] self-center">📖</div>
                          <div className="rotate-270 sm:rotate-0 my-auto truncate max-w-full text-center leading-none" style={{ writingMode: window.innerWidth < 640 ? 'vertical-lr' : 'unset' }}>
                            {num}
                          </div>
                          <div className="text-[10px] self-center">📖</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* PUZZLE 2: Fruit Salad */}
            {taskType === 'salad' && (
              <div className="flex flex-col items-center my-4">
                <p className="text-slate-300 text-sm text-center mb-4">
                  Add target ingredient to the fruit bowl:
                </p>
                <div className="bg-slate-800 text-amber-300 px-6 py-3 rounded-2xl text-lg font-bold border-2 border-slate-700 animate-pulse mb-6">
                  {targetIngredient}
                </div>
                <div className="grid grid-cols-2 gap-3 w-full">
                  {ingredients.map((ing, i) => (
                    <button
                      key={i}
                      id={`salad_ingredient_${i}`}
                      onClick={() => handleSaladClick(ing)}
                      className="bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-100 p-4 rounded-xl border border-slate-700 text-center font-medium transition active:scale-95 text-lg"
                    >
                      {ing}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 mt-6">
                  {[0, 1, 2, 3].map((step) => (
                    <div 
                      key={step}
                      className={`w-12 h-3 rounded-full transition-colors ${
                        step < saladSteps ? 'bg-amber-400' : 'bg-slate-700'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* PUZZLE 3: Vintage Clock */}
            {taskType === 'clock' && (
              <div className="flex flex-col items-center my-4">
                <p className="text-slate-300 text-sm text-center mb-6">
                  Set the beautiful clock hand to the timezone: <strong className="text-amber-400">{targetHour}:00</strong>!
                </p>
                <div className="relative w-44 h-44 bg-slate-800 rounded-full border-4 border-slate-700 flex items-center justify-center mb-6">
                  {/* Target ring */}
                  <div 
                    className="absolute inset-2 border-2 border-dotted border-amber-400/30 rounded-full"
                    style={{ transform: `rotate(${(targetHour - 12) * 30}deg)` }}
                  >
                    <div className="absolute top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-amber-400 rounded-full" />
                  </div>

                  {/* Active hand */}
                  <div 
                    className="w-1.5 h-16 bg-red-500 origin-bottom rounded-full transition-transform duration-300 absolute"
                    style={{ 
                      transform: `translateY(-50%) rotate(${clockHour * 30}deg)`,
                      top: '18%'
                    }}
                  />
                  
                  {/* Center pin */}
                  <div className="w-5 h-5 bg-white border-2 border-red-500 rounded-full z-10" />

                  {/* Hour markers labels */}
                  <div className="absolute top-2 text-slate-500 text-xs font-bold">12</div>
                  <div className="absolute right-3 text-slate-500 text-xs font-bold">3</div>
                  <div className="absolute bottom-2 text-slate-500 text-xs font-bold">6</div>
                  <div className="absolute left-3 text-slate-500 text-xs font-bold">9</div>

                  {/* Current hour output */}
                  <div className="absolute bottom-10 bg-slate-900 border border-slate-700 text-white px-2 py-0.5 rounded text-xs font-mono">
                    {clockHour}:00
                  </div>
                </div>

                <div className="flex gap-4 w-full">
                  <button
                    id="clock_down_btn"
                    onClick={() => adjustClock('down')}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-100 p-3 rounded-xl border border-slate-700 font-bold active:scale-95 transition"
                  >
                    ⏮️ Reverse
                  </button>
                  <button
                    id="clock_up_btn"
                    onClick={() => adjustClock('up')}
                    className="flex-1 bg-amber-400 hover:bg-amber-300 text-slate-900 p-3 rounded-xl font-bold active:scale-95 transition"
                  >
                    Advance ⏭️
                  </button>
                </div>
              </div>
            )}

            {/* PUZZLE 4: Watering the Flowers */}
            {taskType === 'flowers' && (
              <div className="flex flex-col items-center my-4">
                <p className="text-slate-300 text-sm text-center mb-6">
                  Press and hold the Water Can to water the beautiful blossoms!
                </p>
                <div className="flex items-end justify-center h-24 gap-4 mb-6 relative w-full">
                  {/* Splashes */}
                  {isWatering && (
                    <div className="absolute top-0 text-sky-400 animate-bounce text-xl">💧 🌊</div>
                  )}
                  {/* Garden pot and flower grows */}
                  <div className="flex flex-col items-center">
                    <span 
                      className="transition-transform duration-300 origin-bottom"
                      style={{ transform: `scale(${0.4 + (flowerWater / 100) * 0.8})` }}
                    >
                      🌸
                    </span>
                    <div className="w-12 h-10 bg-amber-800 rounded-b-xl border-t border-amber-900" />
                  </div>
                </div>

                <div className="w-full bg-slate-800 h-4 rounded-full border border-slate-700 overflow-hidden mb-6">
                  <div 
                    className="bg-sky-400 h-full transition-all duration-100" 
                    style={{ width: `${flowerWater}%` }}
                  />
                </div>

                <button
                  id="water_hold_btn"
                  onMouseDown={() => setIsWatering(true)}
                  onMouseUp={() => setIsWatering(false)}
                  onMouseLeave={() => setIsWatering(false)}
                  onTouchStart={() => setIsWatering(true)}
                  onTouchEnd={() => setIsWatering(false)}
                  className={`w-full p-4 rounded-2xl text-center font-bold tracking-wide transition select-none ${
                    isWatering 
                      ? 'bg-sky-500 text-white shadow-lg ring-4 ring-sky-300 scale-98' 
                      : 'bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700'
                  }`}
                >
                  {isWatering ? 'Watering ... 💧' : 'Hold to Pour Water 🪣'}
                </button>
              </div>
            )}

            {/* PUZZLE 5: Tidy Toys matching */}
            {taskType === 'toybox' && (
              <div className="flex flex-col items-center my-4">
                <p className="text-slate-300 text-sm text-center mb-4">
                  Match the toy to the correct collection box!
                </p>

                <div className="flex items-center justify-between w-full my-4">
                  {/* Target toy */}
                  <div className="bg-slate-800 p-4 rounded-2xl border-2 border-dashed border-amber-300 animate-pulse text-center w-1/3">
                    <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Pick up</div>
                    <span className="text-2xl font-bold">{toyShape}</span>
                  </div>

                  <div className="text-slate-500 font-bold">➡️</div>

                  {/* Target Box description */}
                  <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 text-center w-1/3">
                    <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Put in</div>
                    <span className="text-2xl font-bold">{toyBoxTarget}</span>
                  </div>
                </div>

                <div className="flex gap-4 w-full mt-4">
                  <button
                    id="toy_box_mismatch_btn"
                    onClick={() => handleToyDrop(toyShape !== toyBoxTarget)}
                    className="flex-1 bg-red-950/40 hover:bg-red-900/40 text-red-400 p-3 rounded-xl border border-red-900 font-bold active:scale-95 transition"
                  >
                    Doesn't Match ❌
                  </button>
                  <button
                    id="toy_box_match_btn"
                    onClick={() => handleToyDrop(toyShape === toyBoxTarget)}
                    className="flex-1 bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-400 p-3 rounded-xl border border-emerald-900 font-bold active:scale-95 transition"
                  >
                    Matches! ✅
                  </button>
                </div>

                <div className="flex gap-2 mt-6">
                  {[0, 1, 2].map((step) => (
                    <div 
                      key={step}
                      className={`w-12 h-3 rounded-full transition-colors ${
                        step < toysPlaced ? 'bg-amber-400' : 'bg-slate-700'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
