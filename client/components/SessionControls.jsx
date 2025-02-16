import { useState } from "react";
import { Mic, Square } from "react-feather";
import Button from "./Button";

// function StartSessionButton({ isActivating, onClick }) {
//   return (
//     <Button
//       onClick={onClick}
//       icon={<Mic height={64} />}
//       className={`size-20 ${
//         isActivating ? "bg-gray-600 animate-pulse" : "bg-red-600"
//       }`}
//       aria-label={isActivating ? "Starting session..." : "Start session"}
//     >
//       <span className="sr-only">
//         {isActivating ? "Starting session..." : "Start session"}
//       </span>
//     </Button>
//   );
// }
function StartSessionButton({ isActivating, onClick }) {
  return (
    <>
      <Button
        onClick={onClick}
        icon={<Mic height={64} />}
        className={`size-20 transition-all duration-500 ease-in-out transform ${
          isActivating
            ? "bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 animate-organic"
            : "bg-red-600 rounded-full"
        }`}
        aria-label={isActivating ? "Starting session..." : "Start session"}
      >
        <span className="sr-only">
          {isActivating ? "Starting session..." : "Start session"}
        </span>
      </Button>
      {/* <style jsx>{`
        @keyframes organic {
          0% {
            border-radius: 50% 20% 30% 60%;
          }
          25% {
            border-radius: 70% 20% 50% 40%;
          }
          50% {
            border-radius: 40% 60% 30% 50%;
          }
          75% {
            border-radius: 50% 30% 60% 40%;
          }
          100% {
            border-radius: 50% 20% 30% 60%;
          }
        }
        .animate-organic {
          animation: organic 3s infinite;
        }
      `}</style> */}
    </>
  );
}


function SessionStopped({ startSession }) {
  const [isActivating, setIsActivating] = useState(false);

  function handleStartSession() {
    if (isActivating) return;

    setIsActivating(true);
    startSession();
  }

  return (
    <div className="flex items-center justify-center w-full h-full">
      <StartSessionButton
        isActivating={isActivating}
        onClick={handleStartSession}
      />
    </div>
  );
}

function SessionActive({ stopSession, sendTextMessage }) {
  const [message, setMessage] = useState("");

  function handleSendClientEvent() {
    sendTextMessage(message);
    setMessage("");
  }

  return (
    <div className="flex items-center justify-center w-full h-full gap-4">
      {/* 
      text input disabled for now
      <input
        onKeyDown={(e) => {
          if (e.key === "Enter" && message.trim()) {
            handleSendClientEvent();
          }
        }}
        type="text"
        placeholder="send a text message..."
        className="border border-gray-200 rounded-full p-4 flex-1"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />  <Button
        onClick={() => {
          if (message.trim()) {
            handleSendClientEvent();
          }
        }}
        icon={<MessageSquare height={16} />}
        className="bg-blue-400 size-40"
      >
        send text
      </Button> */}
      <Button
        onClick={stopSession}
        icon={<Square height={64} />}
        className="size-20 bg-red-600"
      ></Button>
    </div>
  );
}

export default function SessionControls({
  startSession,
  stopSession,
  sendClientEvent,
  sendTextMessage,
  serverEvents,
  isSessionActive,
}) {
  return (
    <div className="flex gap-4 h-full rounded-md">
      {isSessionActive ? (
        <SessionActive
          stopSession={stopSession}
          sendClientEvent={sendClientEvent}
          sendTextMessage={sendTextMessage}
          serverEvents={serverEvents}
        />
      ) : (
        <SessionStopped startSession={startSession} />
      )}
    </div>
  );
}
