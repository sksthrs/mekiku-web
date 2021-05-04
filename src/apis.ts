export namespace Apis {
  export type FetchConfigResponse = {
    api_key: string,
    debug_level: number,
    subtitler_url_value: string,
    auth_url: string
  }

  export const isFetchConfigResponse = (json: unknown): json is FetchConfigResponse => {
    const r = json as FetchConfigResponse
    return (
      typeof r?.api_key === 'string'
      && typeof r?.debug_level === 'number'
      && typeof r?.subtitler_url_value === 'string'
      && typeof r?.auth_url === 'string'
    )
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
}
