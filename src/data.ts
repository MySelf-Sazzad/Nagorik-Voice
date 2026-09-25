export type Status = 'Reported' | 'Acknowledged' | 'Under Review' | 'In Progress' | 'Resolved'
export type GovernmentApproval = { description:string; startDate:string; approvedAt:string }
export type Issue = { id:number; title:string; description:string; author:string; handle:string; avatar:string; authorId?:string; verified?:boolean; time:string; location:string; district:string; category:string; status:Status; severity:'Low'|'Medium'|'High'|'Critical'; supports:number; comments:number; shares:number; image:string; images?:string[]; saved?:boolean; supported?:boolean; lat:number; lng:number; sentToGovernment?:boolean; governmentApproval?:GovernmentApproval; createdAt?:string }

export const categories = ['All issues','Broken Road','Pothole','Waterlogging','Drainage','Garbage/Waste','Traffic Congestion','Streetlight','Water Supply','Public Safety','Environmental Issue']

// Production data is loaded from Supabase. Keeping these empty prevents old demo data from appearing.
export const issues: Issue[] = []
export const notifications: {icon:'support'|'comment'|'status'|'resolved';text:string;detail:string;time:string}[] = []
