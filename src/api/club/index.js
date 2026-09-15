import request from '@/utils/request'

export function getClubDashboard() {
  return request({ url: '/club/admin/dashboard', method: 'get' })
}

export function listClubEntity(type, query) {
  return request({ url: `/club/admin/${type}/list`, method: 'get', params: query })
}

export function saveClubEntity(type, data) {
  return request({ url: `/club/admin/${type}`, method: 'post', data })
}

export function getClubEntity(type, id) {
  return request({ url: `/club/admin/${type}/${id}`, method: 'get' })
}

export function deleteClubEntity(type, id, reason, requestId) {
  return request({ url: `/club/admin/${type}/${id}`, method: 'delete', params: { reason, requestId } })
}

export function uploadClubVoice(blob,seconds) {
  const data=new FormData();data.append('file',blob,'recording.wav');data.append('seconds',String(seconds))
  return request({url:'/club/admin/voice-files',method:'post',data,timeout:60000,headers:{'Content-Type':'multipart/form-data',repeatSubmit:false}})
}
export function getWalletRecords(id,params){return request({url:`/club/admin/wallets/${id}/records`,method:'get',params})}
export function adjustWallet(id,data){return request({url:`/club/admin/wallets/${id}/adjustments`,method:'post',data,headers:{repeatSubmit:false}})}
