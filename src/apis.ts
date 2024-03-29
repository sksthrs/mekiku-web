import TmpConfig from "./TmpConfig"

export namespace Apis {

  // ========== ========== Fetch Server Config ========== ==========

  export type FetchConfigResponse = {
    api_key: string,
    debug_level: number,
    subtitler_url_key: string,
    auth_url: string
  }

  export const isFetchConfigResponse = (json: unknown): json is FetchConfigResponse => {
    const r = json as FetchConfigResponse
    return (
      typeof r?.api_key === 'string'
      && typeof r?.debug_level === 'number'
      && typeof r?.subtitler_url_key === 'string'
      && typeof r?.auth_url === 'string'
    )
  }

  // ========== ========== Query Room ========== ==========

  export const queryRoom = (roomHash: string): Promise<Response> => {
    const authUrl = TmpConfig.getAuthUrl()
    const fetchUrl = authUrl + roomHash
    return fetch(fetchUrl)
  }

  export type GetRoomResponse = {
    ip: string,
    vn: string,
    vp: string
  }

  export const HIDE = '0'
  export const SHOW = '1'

  export const isGetRoomResponse = (json: unknown): json is GetRoomResponse => {
    const r = json as GetRoomResponse
    return (
      typeof r?.ip === 'string'
      && typeof r?.vn === 'string'
      && typeof r?.vp === 'string'
    )
  }

  // ========== ========== Login Room ========== ==========

  export type LoginRoomArgument = {
    roomHash: string,
    userName: string,
    userType: string,
    password: string,
  }

  export const loginRoom = (arg:LoginRoomArgument): Promise<Response> => {
    const url = TmpConfig.getAuthUrl() + "login"
    const params = new URLSearchParams()
    params.append('roomHash', arg.roomHash)
    params.append('userName', arg.userName)
    params.append('userType', arg.userType)
    params.append('pass', arg.password)
    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    })
  }

  export type PostLoginResponse = {
    id: string,
    roomName: string,
    zoomUrl: string,
    credential: Credential,
  }

  export const isPostLoginResponse = (json: unknown): json is PostLoginResponse => {
    const r = json as PostLoginResponse
    return (
      typeof r?.id === 'string'
      && typeof r?.roomName === 'string'
      && typeof r?.zoomUrl === 'string'
      && typeof r?.credential?.timestamp === 'number'
      && typeof r?.credential?.ttl === 'number'
      && typeof r?.credential?.authToken === 'string'
    )
  }

  // ========== ========== Logout Room ========== ==========

  export const logoutRoom = (): Promise<Response> => {
    const url = TmpConfig.getAuthUrl() + "logout"
    const params = new URLSearchParams() // send empty one
    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    })
  }

  // ========== ========== Set Zoom API key ========== ==========

  export type UpdateZoomArgument = {
    key: string,
  }

  export const updateZoom = (arg:UpdateZoomArgument): Promise<Response> => {
    const url = TmpConfig.getAuthUrl() + "zoom"
    const params = new URLSearchParams()
    params.append('key', arg.key)
    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    })
  }

  // ========== ========== Send Caption ========== ==========

  export type SendCaptionArgument = {
    message: string,
  }

  export const sendCaption = (arg:SendCaptionArgument): Promise<Response> => {
    const url = TmpConfig.getAuthUrl() + "captions"
    const params = new URLSearchParams()
    params.append('message', arg.message)
    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    })
  }

  export type SendCaptionErrorResponse = {
    error_type: string,
    response: string,
    error_code: string,
    error_message: string,
    http_code: string
  }

  export const isSendCaptionErrorResponse = (json: unknown): json is SendCaptionErrorResponse => {
    const r = json as SendCaptionErrorResponse
    return (
      typeof r?.error_type === 'string'
      && typeof r?.response === 'string'
      && typeof r?.error_code === 'string'
      && typeof r?.error_message === 'string'
      && typeof r?.http_code === 'string'
    )
  }

  // ========== ========== Heartbeat (for keeping server session) ========== ==========

  export type SendHeartBeatArgument = {
    message: string,
  }

  export const sendHeartBeat = (arg:SendHeartBeatArgument): Promise<Response> => {
    const url = TmpConfig.getAuthUrl() + "hb"
    const params = new URLSearchParams()
    params.append('message', arg.message)
    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    })
  }

}
