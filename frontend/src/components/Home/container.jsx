  import React, {useRef, useEffect, useState, useCallback} from 'react'
  import styles from  './style.css'
  import io from 'socket.io-client';
  import Loading from "./loading"; 
  import { Peer } from 'peerjs'; 
  const socketCon = io('ws://localhost:8000');

  /// Creaing Peer connection using peerJs
  const peerConn = new Peer()

  function Container  () {

      const [recorder, setRecorder] = useState(null);
      const [chunks, setChunks] = useState([]);
      const [stream, setStream] = useState(null)  
      const videoRef = useRef(null);
      const [selectedCamera, setSelectedCamera] = useState(null);
      const [videoUrl, setVideoUrl] = useState(null);
      const [active, setActive] = useState(false);
      const [seconds, setSeconds] = useState(0);
      const [timeInterval, setTimeInterval]= useState(false)
      const [processing, setProcessing] = useState(false)
      const [isLoading, setIsLoading] = useState(false)
      const [originalSize, setOriginalSize] = useState(0)
      const [compressedSize, setCompressedSize] = useState(0)
      const [videoLink, setVideoLink] = useState(null)
      const [latitude, setLatitude] = useState(null);
      const [longitude, setLongitude] = useState(null);
      const [locationInterval, setLocationInterval] = useState(false);
      const streamRef = useRef();
      streamRef.current = stream;

      let timerInterval;
      let locInterval;
      var dataChunk = []
      var timeslice = 3000;

      const getLivelocation = (isLive = false) => {
        if(isLive == true) {
          console.log("It's coming true");
          setLocationInterval(false) 
          locInterval = setInterval(() => {
              navigator.geolocation.getCurrentPosition((position) => {
                setLatitude(position.coords.latitude)
                setLongitude(position.coords.longitude)
                const timestamp = Date.now();
                socketCon.emit("getLiveLocation", {latitude: position.coords.latitude, longitude: position.coords.longitude, current_time:timestamp})
              })
              
          }, 5000);
          setLocationInterval(locInterval)
        } else {
          clearInterval(locationInterval)
        }
      }

      const getLocationPermission = () => {
        if(navigator.geolocation) {
          navigator.geolocation.getCurrentPosition((position) => {
            setLatitude(position.coords.latitude)
            setLongitude(position.coords.longitude)
          })
         } else {
           console.log("Geolocation is not supported!");
         }
      }

      const manageTimer = (flag) => {
        if(flag) {
          setSeconds(0)
          setTimeInterval(false)
          timerInterval = setInterval(() => {
            setSeconds(prevSeconds => prevSeconds + 1);
          }, 1000);
          setTimeInterval(timerInterval)
        } else {
          clearInterval(timeInterval);
        }
      };

    const handleVideoSize = useCallback(async (data) => {  
        setOriginalSize(data.data)
        setIsLoading(false)
        setProcessing(true)
    }, [])

    const handleCompressedSize = async (data) => {
      console.log("Getting compressed vidoe size", data.data);
      setCompressedSize(data.data)
      setProcessing(false)
    }

    const handleCompressVideoLink = async (data) => {
      console.log("Getting video link", data.data);
      setVideoLink(data.data)
    }

      useEffect(() => {
        console.log("socket connection status- ", socketCon);
  
        socketCon.on('videoSize', handleVideoSize);
        socketCon.on("compressVideoSize", handleCompressedSize)
        socketCon.on("compressed_video_link", handleCompressVideoLink)

        return () => {

          socketCon.off('videoSize', handleVideoSize);
          socketCon.off("compressVideoSize", handleCompressedSize)
          socketCon.off("compressed_video_link", handleCompressVideoLink)

        };  

      }, [
        socketCon,
        handleVideoSize,
        handleCompressedSize,
        handleCompressVideoLink,
  
      ])

      async function callAdmin(adminpeerConn) {

        try {

          const call = peerConn.call(adminpeerConn, streamRef.current);
          call.addStream(stream);
          // console.log("stream", stream);
          console.log("call", call);

           // Check the status of the call
          call.on('stream', (adminStream) => {
            console.log('Call was successful');
          });

          call.on('close', () => {
              // The call was closed (ended)
              console.log('Call was closed');
          });

          call.on('error', (error) => {
              // An error occurred during the call
              console.error('Error during the call:', error.message);
          });

        } catch (error) {
          console.log("Getting trouble in calling admin", error.message); 
        }
      }

      useEffect(() => {
    
        try {
            // Handle errors
            peerConn.on('error', (error) => {
              console.error('PeerJS error:', error);
            });

            peerConn.on("connection", (conn) => {
            conn.on("data", (data) => {
           
              console.log("Recieving data from another peer", data);
              callAdmin(data)
            });

            conn.on("open", () => {
              conn.send("hello!");
            });
          });
          
        } catch (error) {
          console.log("Getting issue in video calling", error.message);
        }
      }, [])
    
      useEffect(() => {

          const getVideoInputDevices = async () => {
            try {
              console.log('getvideo inptu device called!');
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
              return device.label.includes('Integrated Camera');
            });
      
            if (irCamera) {
              console.log(irCamera.deviceId, "This is the name of selected camera");
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
      
          getLocationPermission()
          requestPermissionsAndSelectCamera();

        return () => {
          clearInterval(timerInterval);
        };  
      }, []);

      // Capturing the video
      const startCapture = async () => {   
          
          if(selectedCamera) {
              try {
                  const stream = await navigator.mediaDevices.getUserMedia({ video: {deviceId: selectedCamera}, audio: true });
                  setStream(stream)
                 
                  if (videoRef.current) {
                    videoRef.current.srcObject = stream;                  }

                  // Recording the video here which is getting captured 
                  const recorder = new MediaRecorder(stream);
                  setRecorder(recorder);
                  setActive(true)
                  setOriginalSize(false)
                  setCompressedSize(false)  
                  recorder.start(timeslice);
                  recorder.ondataavailable = handleDataAvailable
                  manageTimer(true) 
                  getLivelocation(true)
                  // Starting Webrtc implementation
                  startCall(stream)
                } catch (error) {
                  console.error('Error accessing camera:', error.message);
                }
          } else {
            console.log("Getting trouble in accessing device camera");
          }
          
        }; 

        // Start calling 
        async function startCall(stream) {

          try {
            socketCon.emit("live_stream_data", {type: "user_peer", peer: peerConn.id })
          } catch (error) {
            console.log("Error in start call", error.message);
          }
        }

        const handleDataAvailable = (event) => {
          try {
            if (event.data.size > 0) {
              setChunks((prevChunks) => [...prevChunks, event.data]); 
              dataChunk.push(event.data)  
            }

              if (socketCon) {
                // socketCon.emit('getBlobData', { data: event.data });
              }
          } catch (error) {
            console.log('Error in managing chunks ');
            console.log(error.message); 
          }

        };

        // stop capturing the video 
        const stopCapture = () => {

            // peerConn.close()
            recorder.stop();
            setRecorder(null)
            const blob = new Blob(chunks, { type: 'video/mp4' }); 
            const url = URL.createObjectURL(blob);
            setVideoUrl(url);
            manageTimer(false)
            setIsLoading(true)
            getLivelocation(false) // Stoping location capture procedure 
            // Completing the stream
            if (socketCon) {
               setTimeout(() => {
                  setActive(!active)
                  console.log("Making stream complete");
                  // socketCon.emit('completeStream');
               }, 500);
            }
      
            if (stream) {
              stream.getTracks().forEach((track) => {
                track.stop(); // This will stop the camera and audio recor  ding
              });
            }
        };

        function checkLocation(){

          console.log(latitude, longitude, "Current location...!");
        }

      return (    
          <div>
              <div>   
                  <div className="container">
                  <div className="row">
                      <div className="col-2">
                      </div> 
                      <div className="col-8">

                          <div className="mt-5 main-div">
                              <video className="video-div" autoPlay ref={videoRef}></video>
                          </div>

                          <div className="btn-div d-flex justify-content-centre align-items-center pt-3">
                              <button onClick={checkLocation}>check location</button>
                              <button className="btn btn-primary" disabled={active}  onClick={startCapture} >Start </button>
                              <button className="btn btn-danger" disabled={!active} style={{marginLeft: "15px"}} onClick={stopCapture}>Stop</button>
                              <strong>
                                <span className='timer-span'> Timer - {seconds} (sec)  </span>  
                                { (originalSize) ? <span className='timer-span'> Original Video Size - {originalSize} MB </span> : '' }
                                {(compressedSize) ? <span className='timer-span'> Compressed Video Size - {compressedSize} MB </span> : ''  }
                              </strong>
                          </div>

                          { (videoLink) ? <a href={videoLink} className='btn btn-primary mt-2' target="blank" >Play Compressed Video </a> : '' }
                          { (isLoading || processing) ? <Loading message={ (isLoading) ? "Calculating video size" : "Compressing video"} /> : '' }
                          <div className="mt-5 pt-5 d-none">
                            <h5>Output Video : </h5>  
                            <video className="video-div" controls src={videoUrl} />
                          </div>

                      </div>
                      <div className="col-2"></div>
                  </div>
              </div>
              </div>
          </div>
      )

  }

  export default Container;