<template>
  <div class="voice-recorder">
    <div><el-button :disabled="busy" type="primary" @click="recording ? stop() : start()">{{recording?'停止录音':(modelValue?'重新录制':'开始录音')}}</el-button><span v-if="recording"> 正在录制 {{elapsed}} 秒 / 60秒</span></div>
    <audio v-if="modelValue && !recording" :src="source" controls @error="error='语音播放失败，请重新录制'"/>
    <el-button v-if="modelValue && !recording" :disabled="busy" link type="danger" @click="remove">删除语音</el-button>
    <span v-if="busy">正在处理录音…</span><span v-if="!modelValue && !recording && !busy">暂无语音</span>
    <el-alert v-if="error" :title="error" type="error" :closable="false"/>
  </div>
</template>
<script setup>
import { ref,computed,onBeforeUnmount } from 'vue'
import { startBrowserVoice,voiceError } from '@/utils/browser-voice.mjs'
import { uploadClubVoice } from '@/api/club'
const props=defineProps({modelValue:{type:String,default:''}}), emit=defineEmits(['update:modelValue','duration','busy'])
const busy=ref(false),recording=ref(false),elapsed=ref(0),error=ref('')
const source=computed(()=>props.modelValue.startsWith('/profile/')?`${import.meta.env.VITE_APP_BASE_API}${props.modelValue}`:props.modelValue)
let capture,timer,disposed=false
function changed(){emit('busy',busy.value||recording.value)}
async function start(){error.value='';busy.value=true;changed();try{capture=await startBrowserVoice();if(disposed){capture.cancel();return}recording.value=true;elapsed.value=0;timer=setInterval(()=>{elapsed.value++;if(elapsed.value>=60)stop()},1000)}catch(e){error.value=voiceError(e)}finally{busy.value=false;changed()}}
async function stop(){if(!recording.value)return;clearInterval(timer);recording.value=false;busy.value=true;changed();try{const clip=capture.stop();const result=await uploadClubVoice(clip.blob,clip.seconds);if(!disposed){emit('update:modelValue',result.data.url);emit('duration',result.data.seconds)}}catch(e){error.value=voiceError(e)}finally{busy.value=false;changed()}}
function remove(){emit('update:modelValue','');emit('duration',0)}
onBeforeUnmount(()=>{disposed=true;clearInterval(timer);capture?.cancel();emit('busy',false)})
</script>
<style scoped>.voice-recorder{display:flex;flex-direction:column;align-items:flex-start;gap:12px;width:100%}.voice-recorder audio{max-width:100%}</style>
