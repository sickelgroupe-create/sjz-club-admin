import test from 'node:test'
import assert from 'node:assert/strict'
import { startBrowserVoice, voiceError } from '../src/utils/browser-voice.mjs'

test('permission and missing-device errors retain user-facing messages', () => {
  assert.match(voiceError({name:'NotAllowedError'}), /麦克风权限/)
  assert.match(voiceError({name:'NotFoundError'}), /未检测到麦克风/)
  assert.equal(voiceError(new Error('custom')), 'custom')
})

test('unsafe origins never request the microphone', async () => {
  const old=Object.getOwnPropertyDescriptor(globalThis,'isSecureContext')
  Object.defineProperty(globalThis,'isSecureContext',{value:false,configurable:true})
  try { await assert.rejects(startBrowserVoice(), /HTTPS/) }
  finally { if(old)Object.defineProperty(globalThis,'isSecureContext',old);else delete globalThis.isSecureContext }
})

test('local recorder creates mono WAV and releases microphone resources', async () => {
  const names=['isSecureContext','navigator','AudioContext']
  const saved=Object.fromEntries(names.map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)]))
  let stopped=0,closed=0,processor
  class FakeAudioContext {
    sampleRate=16000
    destination={}
    async resume(){}
    createMediaStreamSource(){return {connect(){},disconnect(){}}}
    createScriptProcessor(){processor={connect(){},disconnect(){}};return processor}
    close(){closed++}
  }
  const replacements={isSecureContext:true,navigator:{mediaDevices:{getUserMedia:async()=>({getTracks:()=>[{stop(){stopped++}}]})}},AudioContext:FakeAudioContext}
  for(const [name,value] of Object.entries(replacements))Object.defineProperty(globalThis,name,{value,configurable:true})
  try {
    const recording=await startBrowserVoice()
    processor.onaudioprocess({inputBuffer:{getChannelData:()=>new Float32Array(16000)}})
    const clip=recording.stop()
    assert.equal(clip.seconds,1);assert.equal(clip.blob.type,'audio/wav')
    const bytes=new Uint8Array(await clip.blob.arrayBuffer())
    assert.equal(new TextDecoder().decode(bytes.slice(0,4)),'RIFF')
    assert.equal(bytes.length,32044);assert.equal(stopped,1);assert.equal(closed,1)
    recording.cancel();assert.equal(stopped,1)
  } finally {
    for(const name of names){if(saved[name])Object.defineProperty(globalThis,name,saved[name]);else delete globalThis[name]}
  }
})
