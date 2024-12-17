import React from 'react';
import './style.css'; 

const LoadingSpinner = (props) => {
    return (
      <div className="loading-spinner">
        <figure>
            <div className="progress">
                <div className="progress-bar progress-bar-info progress-bar-striped active"></div>
            </div>
            <figcaption className="info">{props.message}</figcaption>
        </figure>
      </div>
    );
  }
  

  export default LoadingSpinner;

