import type { AppUser } from '../Auth'
import type { Issue } from '../data'
import type { AppNotification } from '../NotificationCenter'

export interface StoredMention {
  id: string
  targetUsername: string
  mentionedBy: string
  avatar?: string
  sourceType: 'comment' | 'post'
  sourceTitle: string
  snippet: string
  issueId: number
  createdAt: string
}

const STORAGE_MENTIONS_KEY = 'nagorik-stored-mentions'

export function getStoredMentions(): StoredMention[] {
  try {
    const raw = localStorage.getItem(STORAGE_MENTIONS_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

export function saveMention(mention: StoredMention): void {
  try {
    const list = getStoredMentions()
    // Don't add duplicate by id
    if (!list.some(m => m.id === mention.id)) {
      list.unshift(mention)
      localStorage.setItem(STORAGE_MENTIONS_KEY, JSON.stringify(list.slice(0, 100)))
      window.dispatchEvent(new CustomEvent('nagorik-notifications-updated'))
    }
  } catch (err) {
    console.error('Failed to save mention:', err)
  }
}

export function parseAndSaveMentions(
  text: string,
  authorName: string,
  issueId: number,
  issueTitle: string,
  sourceType: 'comment' | 'post'
): string[] {
  const matches = text.match(/@([a-zA-Z0-9_.-]+)/g)
  if (!matches) return []

  const detectedUsernames: string[] = []
  for (const rawMatch of matches) {
    const targetUsername = rawMatch.replace(/^@/, '').trim().toLowerCase()
    if (!targetUsername) continue
    detectedUsernames.push(targetUsername)

    const mention: StoredMention = {
      id: `mention-${sourceType}-${issueId}-${targetUsername}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      targetUsername,
      mentionedBy: authorName,
      sourceType,
      sourceTitle: issueTitle,
      snippet: text.length > 90 ? text.substring(0, 90) + '…' : text,
      issueId,
      createdAt: new Date().toISOString()
    }
    saveMention(mention)
  }
  return detectedUsernames
}

export function getReadNotificationIds(userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(`nagorik-read-notifs-${userId}`)
    if (!raw) return new Set()
    const arr = JSON.parse(raw)
    return new Set(Array.isArray(arr) ? arr : [])
  } catch {
    return new Set()
  }
}

export function saveReadNotificationIds(userId: string, ids: Set<string>): void {
  try {
    localStorage.setItem(`nagorik-read-notifs-${userId}`, JSON.stringify(Array.from(ids)))
    window.dispatchEvent(new CustomEvent('nagorik-notifications-updated'))
  } catch (err) {
    console.error('Failed to save read notifications:', err)
  }
}

function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return 'Just now'
  const time = new Date(dateStr).getTime()
  if (isNaN(time)) return dateStr
  const diffSec = Math.floor((Date.now() - time) / 1000)
  if (diffSec < 60) return 'Just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d`
}

/**
 * Computes strictly valid notifications for a specific user:
 * 1. Mentions (@username) in comments or posts
 * 2. Updates on their own reported civic issues (CC approval, status changes, Government approvals)
 * No static or fake notifications are included!
 */
export function getUserNotifications(user: AppUser, issues: Issue[]): AppNotification[] {
  if (!user) return []

  const notifs: AppNotification[] = []
  const userHandle = (user.username || '').toLowerCase().trim()
  const userNameClean = (user.name || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  const userFirst = (user.name || '').toLowerCase().split(' ')[0]

  // 1. Mentions from stored comments / activity
  const allStoredMentions = getStoredMentions()
  for (const m of allStoredMentions) {
    const target = m.targetUsername.toLowerCase()
    const isTarget =
      (userHandle && (target === userHandle || target === userHandle.replace(/\./g, ''))) ||
      (userNameClean && (target === userNameClean || userNameClean.includes(target))) ||
      (userFirst && target === userFirst)

    if (isTarget) {
      notifs.push({
        id: m.id,
        icon: 'comment',
        type: 'mention',
        text: `${m.mentionedBy} mentioned you in a ${m.sourceType}`,
        detail: `"${m.snippet}" on issue "${m.sourceTitle}"`,
        time: formatRelativeTime(m.createdAt),
        issueId: m.issueId,
        createdAt: m.createdAt
      })
    }
  }

  // 2. Mentions in post descriptions
  for (const issue of issues) {
    // Only if author is not the current user
    const isSelfPost = issue.authorId === user.id || issue.handle === user.username
    if (!isSelfPost) {
      const fullText = `${issue.title} ${issue.description}`.toLowerCase()
      const hasMention =
        (userHandle && fullText.includes(`@${userHandle}`)) ||
        (userNameClean && fullText.includes(`@${userNameClean}`)) ||
        (userFirst && fullText.includes(`@${userFirst}`))

      if (hasMention) {
        notifs.push({
          id: `post-mention-${issue.id}`,
          icon: 'comment',
          type: 'mention',
          text: `${issue.author} mentioned you in a report`,
          detail: `"${issue.title}" - ${issue.location}`,
          time: issue.time || formatRelativeTime(issue.createdAt),
          issueId: issue.id,
          createdAt: issue.createdAt
        })
      }
    }
  }

  // 3. Updates on user's own reported issues
  const myReports = issues.filter(
    i => (i.authorId && i.authorId === user.id) || (user.username && i.handle === user.username)
  )

  for (const report of myReports) {
    // 3a. CC Approval
    if (report.isApproved) {
      notifs.push({
        id: `update-approved-${report.id}`,
        icon: 'resolved',
        type: 'update',
        text: 'Report Approved by City Corporation',
        detail: `"${report.title}" was verified and published to the public community feed.`,
        time: report.time || formatRelativeTime(report.createdAt),
        issueId: report.id,
        createdAt: report.createdAt
      })
    }

    // 3b. Status Changes beyond 'Reported'
    if (report.status && report.status !== 'Reported') {
      const isResolved = report.status === 'Resolved'
      notifs.push({
        id: `update-status-${report.id}-${report.status.toLowerCase().replace(/\s+/g, '-')}`,
        icon: isResolved ? 'resolved' : 'status',
        type: 'update',
        text: `Status updated: ${report.status}`,
        detail: `City Corporation updated the status of "${report.title}" to ${report.status}.`,
        time: report.time || formatRelativeTime(report.createdAt),
        issueId: report.id,
        createdAt: report.createdAt
      })
    }

    // 3c. Escalation to Government
    if (report.sentToGovernment) {
      notifs.push({
        id: `update-sentgovt-${report.id}`,
        icon: 'status',
        type: 'update',
        text: 'Report Escalated to Government',
        detail: `"${report.title}" was forwarded to the Government Department for execution.`,
        time: report.time || formatRelativeTime(report.createdAt),
        issueId: report.id,
        createdAt: report.createdAt
      })
    }

    // 3d. Government Approval
    if (report.governmentApproval) {
      notifs.push({
        id: `update-govtapproval-${report.id}`,
        icon: 'resolved',
        type: 'update',
        text: 'Government Project Approved',
        detail: `${report.governmentApproval.description} (Work starts: ${report.governmentApproval.startDate})`,
        time: report.time || formatRelativeTime(report.governmentApproval.approvedAt || report.createdAt),
        issueId: report.id,
        createdAt: report.governmentApproval.approvedAt || report.createdAt
      })
    }
  }

  // Deduplicate by id just in case
  const seen = new Set<string>()
  const deduped: AppNotification[] = []
  for (const n of notifs) {
    if (!seen.has(n.id)) {
      seen.add(n.id)
      deduped.push(n)
    }
  }

  // Sort newest first
  deduped.sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
    return timeB - timeA
  })

  return deduped
}
