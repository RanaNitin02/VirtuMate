import React, { useContext, useEffect, useRef, useState } from 'react'
import { userDataContext } from '../context/UserContext'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import aiImg from "../assets/ai.gif"
import { CgMenuRight } from "react-icons/cg";
import { RxCross1 } from "react-icons/rx";
import userImg from "../assets/user.gif"

function Home() {

  const { userData, url, setUserData, getGeminiResponse } = useContext(userDataContext)

  const navigate = useNavigate()

  const [listening, setListening] = useState(false)
  const [userText, setUserText] = useState("")
  const [aiText, setAiText] = useState("")
  const [ham, setHam] = useState(false)

  const isSpeakingRef = useRef(false)
  const recognitionRef = useRef(null)

  const isRecognizingRef = useRef(false)
  const synth = window.speechSynthesis

  const handleLogOut = async () => {
    try {
      const result = await axios.get(`${url}/auth/logout`, { withCredentials: true })
      setUserData(null)
      navigate("/login")
    } catch (error) {
      setUserData(null)
      console.log(error)
    }
  }

  const startRecognition = () => {

    if (!isSpeakingRef.current && !isRecognizingRef.current) {
      try {
        recognitionRef.current?.start();
        console.log("Recognition requested to start");
      } catch (error) {
        if (error.name !== "InvalidStateError") {
          console.error("Start error:", error);
        }
      }
    }

  }

  const speak = (text) => {
    const utterence = new SpeechSynthesisUtterance(text)
    utterence.lang = 'hi-IN';
    const voices = window.speechSynthesis.getVoices()
    const hindiVoice = voices.find(v => v.lang === 'hi-IN');
    if (hindiVoice) {
      utterence.voice = hindiVoice;
    }


    isSpeakingRef.current = true
    utterence.onend = () => {
      setAiText("");
      isSpeakingRef.current = false;
      setTimeout(() => {
        startRecognition(); // ⏳ Delay se race condition avoid hoti hai
      }, 800);
    }
    synth.cancel(); // 🛑 pehle se koi speech ho to band karo
    synth.speak(utterence);
  }

  const handleCommand = (data) => {
    const { type, userInput, response } = data
    speak(response);

    if (type === 'google-search') {
      const query = encodeURIComponent(userInput);
      window.open(`https://www.google.com/search?q=${query}`, '_blank');
    }
    if (type === 'calculator-open') {

      window.open(`https://www.google.com/search?q=calculator`, '_blank');
    }
    if (type === "instagram-open") {
      window.open(`https://www.instagram.com/`, '_blank');
    }
    if (type === "facebook-open") {
      window.open(`https://www.facebook.com/`, '_blank');
    }
    if (type === "weather-show") {
      window.open(`https://www.google.com/search?q=weather`, '_blank');
    }

    if (type === 'youtube-search' || type === 'youtube-play') {
      const query = encodeURIComponent(userInput);
      window.open(`https://www.youtube.com/results?search_query=${query}`, '_blank');
    }

  }

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognitionRef.current = recognition;

    let isMounted = true;

    const startTimeout = setTimeout(() => {
      if (isMounted && !isSpeakingRef.current && !isRecognizingRef.current) {
        try {
          recognition.start();
          console.log("Recognition requested to start");
        } catch (e) {
          if (e.name !== "InvalidStateError") {
            console.error(e);
          }
        }
      }
    }, 1000);

    recognition.onstart = () => {
      isRecognizingRef.current = true;
      setListening(true);
    };

    recognition.onend = () => {
      isRecognizingRef.current = false;
      setListening(false);
      if (isMounted && !isSpeakingRef.current) {
        setTimeout(() => {
          if (isMounted) {
            try {
              recognition.start();
              console.log("Recognition restarted");
            } catch (e) {
              if (e.name !== "InvalidStateError") console.error(e);
            }
          }
        }, 1000);
      }
    };

    recognition.onerror = (event) => {
      console.warn("Recognition error:", event.error);
      isRecognizingRef.current = false;
      setListening(false);
      if (event.error !== "aborted" && isMounted && !isSpeakingRef.current) {
        setTimeout(() => {
          if (isMounted) {
            try {
              recognition.start();
              console.log("Recognition restarted after error");
            } catch (e) {
              if (e.name !== "InvalidStateError") console.error(e);
            }
          }
        }, 1000);
      }
    };

    recognition.onresult = async (e) => {
      const transcript = e.results[e.results.length - 1][0].transcript.trim();
      if (transcript.toLowerCase().includes(userData.assistantName.toLowerCase())) {
        setAiText("");
        setUserText(transcript);
        recognition.stop();
        isRecognizingRef.current = false;
        setListening(false);
        const data = await getGeminiResponse(transcript);
        handleCommand(data);
        setAiText(data.response);
        setUserText("");
      }
    };


    const greeting = new SpeechSynthesisUtterance(`Hello ${userData.name}, what can I help you with?`);
    greeting.lang = 'hi-IN';

    window.speechSynthesis.speak(greeting);


    return () => {
      isMounted = false;
      clearTimeout(startTimeout);
      recognition.stop();
      setListening(false);
      isRecognizingRef.current = false;
    };
  }, []);




  return (
    <div className="w-full min-h-screen bg-gradient-to-t from-black to-[#02023d] flex flex-col items-center gap-4 px-4 py-6 relative overflow-hidden">

      
      {!ham && (
        <CgMenuRight
          className="lg:hidden text-white fixed top-4 right-4 w-8 h-8 z-50 cursor-pointer"
          onClick={() => setHam(true)}
        />
      )}

      
      <div
        className={`fixed top-0 left-0 w-full h-full bg-[#000000ba] backdrop-blur-lg p-6 pt-16 flex flex-col gap-5 items-start transform transition-transform duration-300 z-40 ${ham ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        <RxCross1
          className="text-white absolute top-4 right-4 w-8 h-8 cursor-pointer z-50"
          onClick={() => setHam(false)}
        />

        
        <button
          className="w-full py-4 bg-blue-500 text-white font-bold cursor-pointer rounded-xl text-lg"
          onClick={handleLogOut}
        >
          Log Out
        </button>
        <button
          className="w-full py-4 bg-blue-500 text-white font-bold cursor-pointer rounded-xl text-lg"
          onClick={() => navigate('/customize')}
        >
          Customize your Assistant
        </button>

        <div className="w-full h-px bg-gray-400 my-2" />
        <h1 className="text-white font-semibold text-xl">History</h1>
        <div className="w-full max-h-[300px] overflow-y-auto flex flex-col gap-2">
          {userData.history?.map((his, index) => (
            <div key={index} className="text-gray-200 text-base">
              {his}
            </div>
          ))}
        </div>
      </div>

      
      <div className="hidden lg:flex flex-col gap-6 absolute top-5 right-5 items-end">
        <button
          className="px-6 py-3 bg-blue-500 cursor-pointer text-black font-bold rounded-full text-base"
          onClick={handleLogOut}
        >
          Log Out
        </button>
        <button
          className="px-6 py-3 bg-blue-500 cursor-pointer text-white font-bold rounded-full text-base"
          onClick={() => navigate('/customize')}
        >
          Customize your Assistant
        </button>
      </div>

      
      <div className="w-[300px] h-[400px] flex justify-center items-center overflow-hidden rounded-4xl shadow-lg mt-10">
        <img src={userData?.assistantImage} alt="Assistant" className="w-full h-full object-cover" />
      </div>

      <h1 className="text-white text-lg sm:text-xl font-semibold mt-2 text-center">
        I'm {userData?.assistantName}
      </h1>

      
      <img
        src={aiText ? aiImg : userImg}
        alt="Status"
        className="w-[140px] sm:w-[180px] mt-4"
      />

      
      <div className="w-full max-w-md text-center mt-4 px-2">
        <h1 className="text-white text-base sm:text-lg font-medium break-words">
          {userText || aiText}
        </h1>
      </div>
    </div>

  )
}

export default Home