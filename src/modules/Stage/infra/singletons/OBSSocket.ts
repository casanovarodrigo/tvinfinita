// import obs_logger from 'app/helpers/obs_logger'
// import sys_logger from 'app/helpers/sys_logger'
import OBSWebSocket from 'obs-websocket-js'

/**
 * Class responsible for OBS Web Socket
 */
class OBSSocketSingleton {
  private socket
  constructor() {
    this.socket = false
    if (!this.socket) {
      this.socket = this.connect()
    }
  }

  /**
   * Connects the socket to obs and returns it
   * @returns {Object|Boolean} OBS Web Socket itself or false if socket failed to connect
   */
  connect() {
    const socketClass = new OBSWebSocket()
    const obs = socketClass
      .connect(`${process.env.OBS_ADDRESS}:${process.env.OBS_PORT}`, process.env.OBS_PSWD)
      .then(async () => {
        // after connecting to the socket
        // error handling
        // socketClass.on('error', (error) => {
        //   obs_logger.error('OBS Web Socket error', { error })
        // })
        return socketClass
      })
      .catch((error) => {
        // obs_logger.error('Error connecting the OBS Web Socket', { error })
        // obs.disconnect()
        console.log('error on connecting OBS Socket', error)
        return false
      })
    if (socketClass) {
      console.log('successfully connected')
      // obs_logger.info('OBS Web Socket connected successfully')
    }
    return obs
  }

  /**
   * Reconnects the socket to obs, sets socket property and returns it
   * @returns {Object|Boolean} OBS Web Socket itself or false if socket failed to connect
   */
  reconnect() {
    this.socket = this.connect()
    return this.socket
  }

  /**
   * Gets class socket property
   * @returns {Object|Boolean} OBS Web Socket itself or false if socket failed to connect
   */
  getSocket() {
    return this.socket
  }
}

const OBSSocket = new OBSSocketSingleton()
export default OBSSocket
