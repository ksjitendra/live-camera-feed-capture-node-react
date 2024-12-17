import React, {useRef} from "react";
import styles from  './style.css'

const layout = (props) => {
     return (
        <div>
            <div className="container">
                <div className="row">
                    <div className="col-2"></div>
                    <div className="col-8">

                        <div className="mt-5 main-div">
                            <video className="video-div" autoPlay   ref={(videoElement) => { if (videoElement) videoElement.srcObject = props.stream; }} />
                        </div>

                        <div className="btn-div d-flex justify-content-centre">
                            <button className="btn btn-primary" onClick={props.startCapture} >Start </button>
                            <button className="btn btn-danger ml-5" onClick={props.stopCapture}>Stop</button>
                        </div>
                    </div>
                    <div className="col-2"></div>
                </div>
            </div>
        </div>  
     )
}

export default layout;