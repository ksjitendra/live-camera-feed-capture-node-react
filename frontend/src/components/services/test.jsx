import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';

const App = () => {
  const [socket, setSocket] = useState(null);
  const [message, setMessage] = useState('');
  const [receivedMessage, setReceivedMessage] = useState('');

  useEffect(() => {
    // Establish the socket connection when the component mounts
    const newSocket = io('http://your-socket-server-url');
    setSocket(newSocket);

    // Clean up the socket connection when the component unmounts
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  // Emit a message to the server and update the local state
  const sendMessage = () => {
    if (socket) {
      socket.emit('chatMessage', message);
      setMessage(''); // Clear the input field
    }
  };

  // Handle incoming messages from the server
  useEffect(() => {
    if (socket) {
      socket.on('chatMessage', (data) => {
        setReceivedMessage(data);
      });
    }
  }, [socket]);

  return (
    <div>
      <h1>Socket.io Chat</h1>
      <div>
        <input
          type="text"
          placeholder="Enter a message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button onClick={sendMessage}>Send</button>
      </div>
      <div>
        <p>Received Message: {receivedMessage}</p>
      </div>
    </div>
  );
};



import React, { useEffect, useState } from 'react';

const VideoCaptureApp = () => {
  const [selectedCamera, setSelectedCamera] = useState(null);

  useEffect(() => {
    const getVideoInputDevices = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: true,
          video: true 
        });

        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((device) => device.kind === 'videoinput');
        return videoDevices;
      } catch (error) {
        console.error('Error enumerating devices:', error);
        return [];
      }
    };

    const selectCamera = async (devices) => {
      // Check if there are any IR cameras
      const irCamera = devices.find((device) => {
        return device.label.toLowerCase().includes('ir');
      });

      if (irCamera) {
        setSelectedCamera(irCamera.deviceId);
      } else if (devices.length > 0) {
        // If no IR camera, select the first available camera
        setSelectedCamera(devices[0].deviceId);
      }
    };

    // Requesting for the user permission on camera and audio
    const requestPermissionsAndSelectCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: true,
          video: true 
        });

        const devices = await getVideoInputDevices();
        selectCamera(devices);
      } catch (error) {
        console.error('Error requesting permissions:', error);
      }
    };

    requestPermissionsAndSelectCamera();
  }, []);

  // Add your startCapture function here

  return (
    <div>
      {/* Add your video capture component here */}
    </div>
  );
};

export default VideoCaptureApp;




        // Function to get the list of available video input devices
        // const getVideoInputDevices = async () => {
        //   try {

        //     const stream = await navigator.mediaDevices.getUserMedia({ 
        //       audio: true,
        //       video: true 
        //     });

        //     const devices = await navigator.mediaDevices.enumerateDevices();
        //     const videoDevices = devices.filter((device) => device.kind === 'videoinput');
        //     return videoDevices;
        //   } catch (error) {
        //     console.error('Error enumerating devices:', error);
        //     return [];
        //   }
        // };
    
        // // Function to select the integrated camera 
        // const selectIntegratedCamera = (devices) => { 
        //   const integratedCamera = devices.find((device) => {
        //     return device.label.includes('Integrated Camera');
        //   });
    
        //   if (integratedCamera) {
        //     setSelectedCamera(integratedCamera.deviceId);
        //   }
        // };
    
        // // Get the list of video input devices and select the integrated camera
        // getVideoInputDevices().then((devices) => {
        //   selectIntegratedCamera(devices);
        // });


      //   let configuration = {
      //     iceServers: [
      //         {
      //             "urls": ["stun:stun.l.google.com:19302", 
      //             "stun:stun1.l.google.com:19302", 
      //             "stun:stun2.l.google.com:19302"]
      //         }
      //     ]
      // }
      // const peerConn = new RTCPeerConnection(configuration)
      // console.log("peerConn", peerConn);
      // peerConn.createOffer((offer) => {
      //   const offerstr = offer;
      //   console.log(offerstr, "Peer connection offer");
      // }, (error)=> {  
      //   console.log(error.message, "Error occured while creating peeroffer");
      // })
      // peerConn.onicecandidate = ((e) => {
      //     if(e.candidate == null) {
      //       console.log("Candiate on this server is null ");  
      //     }

      //     console.log(e.candidate, "Candidate on current peerSever");
      // })