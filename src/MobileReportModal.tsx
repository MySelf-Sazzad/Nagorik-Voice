import { useEffect, useRef, useState } from 'react'
import { Camera, Image as ImageIcon, MapPin, Navigation, RotateCcw, Send, ShieldCheck, X } from 'lucide-react'
import { categories, type Issue } from './data'
import type { AppUser } from './Auth'
import { DHAKA_AREAS, getUserLocation } from './lib/location'

type Draft = Pick<Issue,'title'|'description'|'location'|'district'|'category'|'severity'|'lat'|'lng'>

export default function MobileReportModal({close,publish,user}:{close:()=>void;publish:(draft:Draft,files:File[])=>Promise<void>;user:AppUser}){
 const [step,setStep]=useState(1),[title,setTitle]=useState(''),[description,setDescription]=useState(''),[category,setCategory]=useState('Broken Road'),[severity,setSeverity]=useState<Issue['severity']>('Medium'),[area,setArea]=useState(''),[road,setRoad]=useState(''),[captures,setCaptures]=useState<{file:File;preview:string}[]>([]),[agreed,setAgreed]=useState(false),[publishing,setPublishing]=useState(false),[cameraOpen,setCameraOpen]=useState(false),[cameraMessage,setCameraMessage]=useState('')
 const [coords, setCoords] = useState<{lat:number; lng:number}>({lat:23.8103, lng:90.4125})
 const [gpsAcquired, setGpsAcquired] = useState(false)

 useEffect(() => {
  getUserLocation().then(loc => {
    setCoords({ lat: loc.lat, lng: loc.lng })
    if (!loc.isSimulated) setGpsAcquired(true)
  })
 }, [])

 const onAreaChange = (val: string) => {
   setArea(val)
   const matched = Object.keys(DHAKA_AREAS).find(k => val.toLowerCase().includes(k.toLowerCase()))
   if (matched && !gpsAcquired) {
     setCoords(DHAKA_AREAS[matched])
   }
 }
 const videoRef=useRef<HTMLVideoElement>(null),streamRef=useRef<MediaStream|null>(null)
 const valid=Boolean(title.trim().length>=3 && description.trim().length>=10 && area.trim() && captures.length>0)
 const stopCamera=()=>{streamRef.current?.getTracks().forEach(track=>track.stop());streamRef.current=null;setCameraOpen(false)}
 const startCamera=async()=>{
   setCameraMessage('')
   if(!navigator.mediaDevices?.getUserMedia){
     setCameraMessage('Live camera is not supported in this browser. Please open with HTTPS on your mobile phone or browser.')
     return
   }
   try{
     stopCamera()
     let stream: MediaStream
     try{
       // Try environment (rear) camera first on mobile
       stream=await navigator.mediaDevices.getUserMedia({
         video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}},
         audio:false
       })
     }catch{
       // Fallback to any camera device (e.g. desktop/laptop webcam or front camera)
       stream=await navigator.mediaDevices.getUserMedia({
         video:true,
         audio:false
       })
     }
     streamRef.current=stream
     setCameraOpen(true)
     setTimeout(()=>{
       if(videoRef.current){
         videoRef.current.srcObject=stream
         videoRef.current.play().catch(e=>console.warn('Video play error:',e))
       }
     },50)
   }catch(err:any){
     console.warn('Camera error:',err)
     if(err?.name==='NotAllowedError'||err?.name==='PermissionDeniedError'){
       setCameraMessage('Camera permission was blocked. Please tap the camera icon in your address bar to allow access and try again.')
     }else if(err?.name==='NotFoundError'||err?.name==='DevicesNotFoundError'){
       setCameraMessage('No camera device was detected on this device.')
     }else{
       setCameraMessage('Camera access could not be started. Please allow camera permissions and try again.')
     }
   }
 }
 useEffect(()=>()=>{streamRef.current?.getTracks().forEach(track=>track.stop())},[])
 const capturePhoto=()=>{const video=videoRef.current;if(!video||!video.videoWidth)return;const maxDim=1600;let width=video.videoWidth;let height=video.videoHeight;if(width>maxDim||height>maxDim){if(width>height){height=Math.round((height*maxDim)/width);width=maxDim}else{width=Math.round((width*maxDim)/height);height=maxDim}}const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');if(ctx)ctx.drawImage(video,0,0,width,height);canvas.toBlob(blob=>{if(!blob)return;const file=new File([blob],`nagorik-voice-${Date.now()}.jpg`,{type:'image/jpeg'}),preview=URL.createObjectURL(file);setCaptures(current=>[...current,{file,preview}].slice(0,3));if(captures.length+1>=3)stopCamera()},'image/jpeg',0.82)}
 const goNext=async()=>{if(step===1){setStep(2);if(!captures.length)await startCamera()}else setStep(3)}
 const submit=async()=>{if(!valid||!agreed)return;setPublishing(true);try{await publish({title:title.trim(),description:description.trim(),location:`${area.trim()}${road.trim()?` → ${road.trim()}`:''}`,district:'Dhaka',category,severity,lat:coords.lat,lng:coords.lng},captures.map(capture=>capture.file))}finally{setPublishing(false)}}
 const back=()=>{if(step===2)stopCamera();setStep(value=>value-1)}
 return <div className="modal-backdrop" onMouseDown={event=>event.target===event.currentTarget&&close()}><div className="modal camera-report-modal"><div className="modal-head"><div><span>REPORT A CIVIC ISSUE</span><h2>{step===1?'Tell us what happened':step===2?'Take live photo evidence':'Review and publish'}</h2></div><button onClick={()=>{stopCamera();close()}} aria-label="Close"><X/></button></div><div className="steps"><div className="active"><i>1</i><span>1</span></div><hr className={step>=2?'active':''}/><div className={step>=2?'active':''}><i>2</i><span>2</span></div><hr className={step>=3?'active':''}/><div className={step>=3?'active':''}><i>3</i><span>3</span></div></div><div className="modal-body">
 {step===1&&<><div className="rule-note"><ShieldCheck/><div><b>Keep it civic and factual</b><p>Your report will be reviewed by the City Corporation Admin before appearing on the public news feed.</p></div></div><label className="field"><b>Issue title (at least 3 characters)</b><input value={title} maxLength={100} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Large pothole causing traffic problems"/></label><label className="field"><div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><b>Description</b><small style={{color:description.trim().length>=10?'#16a34a':'#dc2626',fontSize:'11px'}}>{description.trim().length}/10 min characters</small></div><textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Describe the issue in detail (at least 10 characters)..."/></label><div className="form-grid"><label className="field"><b>Category</b><select value={category} onChange={e=>setCategory(e.target.value)}>{categories.slice(1).map(item=><option key={item}>{item}</option>)}</select></label><label className="field"><b>Severity</b><select value={severity} onChange={e=>setSeverity(e.target.value as Issue['severity'])}><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select></label></div></>}
 {step===2&&<><div className="live-camera-note"><Camera size={20}/><span>Use your live camera only. Gallery or previously saved photos cannot be attached.</span></div>{cameraOpen?<div className="live-camera"><video ref={videoRef} autoPlay playsInline muted/><button type="button" className="camera-shutter" onClick={capturePhoto} disabled={captures.length>=3} aria-label="Take photo"><i/></button><span>{captures.length}/3 photos captured</span></div>:<button type="button" className="camera-start" onClick={startCamera}><Camera size={22}/> Open live camera</button>}{cameraMessage&&<p className="camera-message">{cameraMessage}</p>}{captures.length>0&&<div className="camera-captures">{captures.map((capture,index)=><div key={capture.preview}><img src={capture.preview} alt={`Live capture ${index+1}`}/><b>{index+1}</b><button type="button" onClick={()=>{URL.revokeObjectURL(capture.preview);setCaptures(current=>current.filter((_,itemIndex)=>itemIndex!==index))}} aria-label="Remove photo"><X size={14}/></button></div>)}</div>}<label className="field"><b>Area / address</b><input value={area} onChange={e=>onAreaChange(e.target.value)} placeholder="e.g. Uttara, Dhaka"/></label><label className="field"><b>Road / street</b><input value={road} onChange={e=>setRoad(e.target.value)} placeholder="e.g. Road 12"/></label><div style={{fontSize:'11px',color:'#64748b',display:'flex',alignItems:'center',gap:'5px',margin:'-6px 0 10px'}}><Navigation size={12} color="#0869cf"/><span>Attached coordinates: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)} ({gpsAcquired?'Live GPS':'Area approximation'})</span></div></>}
 {step===3&&<><div className="review-card">{captures[0]&&<img src={captures[0].preview} alt="Live evidence"/>}<span className="category">{category}</span><h3>{title||'Untitled issue'}</h3><p>{description}</p><div className="location-line"><MapPin size={15}/>{area}{road?` → ${road}`:''}</div><small>{captures.length} live camera {captures.length===1?'photo':'photos'} attached</small></div><label className="check-row"><input type="checkbox" checked={agreed} onChange={e=>setAgreed(e.target.checked)}/><span>I confirm this is a genuine civic issue and the information is accurate.</span></label></>}
 </div><div className="modal-foot">{step>1?<button className="outline" onClick={back}>Back</button>:<span/>}{step<3?<button className="primary" disabled={step===1&&(!title.trim()||description.trim().length<10)} onClick={goNext}>{step===1?'Continue to camera':'Continue'}</button>:<button className="primary" disabled={!valid||!agreed||publishing} onClick={submit}><Send size={17}/>{publishing?'Publishing…':'Publish issue'}</button>}</div></div></div>
}
