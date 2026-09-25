import type { User } from '@supabase/supabase-js'
import type { AppUser } from '../Auth'
import type { Issue, Status } from '../data'
import { initials } from '../Auth'
import { supabase } from './supabase'

type ProfileRow = { id:string; full_name:string; username:string; city:string; avatar:string; avatar_url?:string|null; cover_url?:string|null; phone?:string|null; address?:string|null; created_at:string; is_banned?:boolean }
type PostRow = { id:number; title:string; description:string; location:string; district:string; category:string; status:Status; severity:Issue['severity']; image_url?:string|null; latitude?:number|null; longitude?:number|null; supports:number; comments:number; shares:number; sent_to_government:boolean; government_description?:string|null; government_start_date?:string|null; government_approved_at?:string|null; created_at:string; profiles:ProfileRow|null; post_images?:{image_url:string;image_order:number}[] }

export const formatUser = (authUser:User, profile?:ProfileRow|null):AppUser => {
  const metadata = authUser.user_metadata || {}
  const name = profile?.full_name || metadata.full_name || authUser.email?.split('@')[0] || 'Citizen'
  return { id:authUser.id, name, email:authUser.email || '', city:profile?.city || metadata.city || 'Dhaka, Bangladesh', username:profile?.username || metadata.username || name.toLowerCase().replace(/[^a-z0-9]+/g,'.').replace(/^\.|\.$/g,''), avatar:profile?.avatar || metadata.avatar || initials(name), avatarUrl:profile?.avatar_url || metadata.avatar_url || '', coverUrl:profile?.cover_url || metadata.cover_url || '', phone:profile?.phone || metadata.phone || '', address:profile?.address || metadata.address || '', createdAt:profile?.created_at || authUser.created_at }
}

export async function getCurrentUser(){
  const { data:{ user } } = await supabase.auth.getUser()
  if(!user) return null
  const { data:profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
  return formatUser(user, profile)
}

const toIssue = (row:PostRow):Issue => ({
  id:row.id, title:row.title, description:row.description, author:row.profiles?.full_name || 'Nagorik Voice citizen', handle:row.profiles?.username || 'citizen', avatar:row.profiles?.avatar || 'NV', time:new Date(row.created_at).toLocaleString(), location:row.location, district:row.district, category:row.category, status:row.status, severity:row.severity, supports:row.supports, comments:row.comments, shares:row.shares, image:row.post_images?.sort((a,b)=>a.image_order-b.image_order)[0]?.image_url || row.image_url || '', images:row.post_images?.sort((a,b)=>a.image_order-b.image_order).map(image=>image.image_url) || (row.image_url?[row.image_url]:[]), lat:row.latitude || 23.81, lng:row.longitude || 90.39, authorId:row.profiles?.id || '', sentToGovernment:row.sent_to_government, governmentApproval:row.government_approved_at ? { description:row.government_description || '', startDate:row.government_start_date || '', approvedAt:row.government_approved_at } : undefined, createdAt:row.created_at
})

export async function fetchPosts(){
  const { data,error } = await supabase.from('posts').select('*, profiles(*), post_images(image_url,image_order)').order('created_at',{ascending:false})
  if(error) throw error
  return ((data || []) as unknown as PostRow[]).map(toIssue)
}

export async function uploadPostImage(userId:string,file:File){
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${userId}/${crypto.randomUUID()}.${extension}`
  const { error } = await supabase.storage.from('post-images').upload(path,file,{cacheControl:'3600',upsert:false})
  if(error) throw error
  return supabase.storage.from('post-images').getPublicUrl(path).data.publicUrl
}

export async function createPost(user:AppUser,input:Pick<Issue,'title'|'description'|'location'|'district'|'category'|'severity'|'image'|'images'|'lat'|'lng'>){
  const images=input.images?.slice(0,3) || (input.image?[input.image]:[])
  const { data,error } = await supabase.from('posts').insert({author_id:user.id,title:input.title,description:input.description,location:input.location,district:input.district,category:input.category,severity:input.severity,image_url:images[0] || null,latitude:input.lat,longitude:input.lng}).select('*, profiles(*)').single()
  if(error) throw error
  if(images.length){const {error:imageError}=await supabase.from('post_images').insert(images.map((image_url,index)=>({post_id:data.id,image_url,image_order:index+1})));if(imageError)throw imageError}
  return {...toIssue(data as unknown as PostRow),image:images[0]||'',images}
}

export async function updateProfile(user:AppUser){
  const baseProfile={full_name:user.name,city:user.city,avatar:initials(user.name),phone:user.phone || null,address:user.address || null,updated_at:new Date().toISOString()}
  const { error } = await supabase.from('profiles').update({...baseProfile,avatar_url:user.avatarUrl || null,cover_url:user.coverUrl || null}).eq('id',user.id)
  if(!error) return
  // This fallback keeps profile edits working until the optional image columns
  // have been added to an older Supabase project.
  if(/avatar_url|cover_url/i.test(error.message)){
    const { error:baseError } = await supabase.from('profiles').update(baseProfile).eq('id',user.id)
    if(!baseError) return
    throw baseError
  }
  throw error
}

export async function uploadProfileImage(userId:string,file:File,kind:'avatar'|'cover'){
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${userId}/profile/${kind}-${crypto.randomUUID()}.${extension}`
  const { error } = await supabase.storage.from('post-images').upload(path,file,{cacheControl:'3600',upsert:false})
  if(error) throw error
  return supabase.storage.from('post-images').getPublicUrl(path).data.publicUrl
}

export async function setCCStatus(postId:number,status:Status){ const {error}=await supabase.rpc('set_cc_post_status',{post_id:postId,new_status:status}); if(error) throw error }
export async function forwardToGovernment(postId:number){ const {error}=await supabase.rpc('forward_to_government',{post_id:postId}); if(error) throw error }
export async function approveGovernmentPost(postId:number,description:string,startDate:string){ const {error}=await supabase.rpc('approve_government_post',{post_id:postId,work_description:description,work_start_date:startDate}); if(error) throw error }
export async function removeGovernmentCase(postId:number){ const {error}=await supabase.rpc('remove_government_case',{post_id:postId}); if(error) throw error }
export async function removeApproval(postId:number){ const {error}=await supabase.rpc('remove_approval',{post_id:postId}); if(error) throw error }
export async function deleteCCPost(postId:number){ const {error}=await supabase.rpc('delete_cc_post',{post_id:postId}); if(error) throw error }
export async function banCitizen(userId:string){ const {error}=await supabase.rpc('ban_citizen',{citizen_id:userId}); if(error) throw error }

export async function getOfficerRole(){
  const { data:{ user } } = await supabase.auth.getUser(); if(!user) return null
  const { data,error } = await supabase.from('admin_roles').select('role').eq('user_id',user.id).maybeSingle()
  if(error) throw error
  return data?.role as 'cc_officer'|'government_officer'|undefined
}
