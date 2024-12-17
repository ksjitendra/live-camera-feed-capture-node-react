class PeerService {
    constructor() {
        if(!this.peer) {
            this.peer = new RTCPeerConnection({
                iceServers : [{
                    "urls": [
                        "stun:stun.l.google.com:19302",
                        "stun:global.stun.twilio.com:3478",
                        ]
                }]

            })
        }
    }

    async createOffer() {
        if(this.peer) {
            const offer = await this.peer.createOffer();
            // await this.peer.setLocalDescription(new RTCSessionDescription(offer))
            return offer;
        }
    }

    async createAnswer(offer) {

        try {
            if(this.peer) {
                await this.peer.setRemoteDescription(offer)
                const ans = this.peer.createAnswer()
                await this.peer.setLocalDescription(new RTCSessionDescription(ans))
                return ans;
            }
        } catch (error) {

            console.log(error.message, "Error in creating answer");
            
        }
        
    }

    async setLocalDescription(ans) {

        try {

            if(this.peer) {
                console.log("Answer in setLocalDescription", ans);
                const result = await this.peer.setRemoteDescription(ans)

                console.log("Setting local description success", result);
            }

            
            
        } catch (error) {

            console.log("Error in setting localDescription", error.message);
            
        }
       
    }


    getConnectionStr() {

        if(this.peer) {
            return this.peer
        }
    }
}


export default new PeerService();