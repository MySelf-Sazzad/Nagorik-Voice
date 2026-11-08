import { useMemo, useState } from 'react'
import { Bell, CheckCircle2, Clock3, MessageCircle, ShieldCheck, ThumbsUp } from 'lucide-react'

export interface AppNotification {
  id: string
  icon: 'support' | 'comment' | 'status' | 'resolved'
  type: 'mention' | 'update'
  text: string
  detail: string
  time: string
  issueId?: number
  createdAt?: string
}

interface Props {
  notifications?: AppNotification[]
  read?: Set<string>
  setRead: (next: Set<string>) => void
  onSelectIssue?: (issueId: number) => void
}

export default function NotificationCenter({ notifications = [], read = new Set(), setRead, onSelectIssue }: Props) {
  const [tab, setTab] = useState<'All' | 'Mentions' | 'Updates'>('All')

  const shown = useMemo(
    () =>
      notifications.filter(n => {
        if (tab === 'All') return true
        if (tab === 'Mentions') return n.type === 'mention'
        return n.type === 'update'
      }),
    [notifications, tab]
  )

  const unreadCount = useMemo(() => notifications.filter(n => !read.has(n.id)).length, [notifications, read])

  const markAll = () => {
    setRead(new Set(notifications.map(n => n.id)))
  }

  const markOne = (id: string, issueId?: number) => {
    if (!read.has(id)) {
      setRead(new Set([...read, id]))
    }
    if (issueId && onSelectIssue) {
      onSelectIssue(issueId)
    }
  }

  return (
    <div className="page narrow-page">
      <div className="page-head notification-heading">
        <div>
          <span className="eyebrow">YOUR NOTIFICATIONS</span>
          <h1>Notifications</h1>
          <p>Real-time updates when someone mentions you or when there is an update on your reported civic issues.</p>
        </div>
        <button className="outline mark-read" disabled={unreadCount === 0} onClick={markAll}>
          {unreadCount > 0 ? `Mark all as read (${unreadCount})` : 'All caught up'}
        </button>
      </div>

      <div className="notification-tabs">
        {(['All', 'Mentions', 'Updates'] as const).map(t => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
            {t}
            {t === 'Mentions' && notifications.filter(n => n.type === 'mention' && !read.has(n.id)).length > 0 && (
              <span className="nav-count" style={{ marginLeft: '6px', fontSize: '10px', padding: '1px 6px' }}>
                {notifications.filter(n => n.type === 'mention' && !read.has(n.id)).length}
              </span>
            )}
            {t === 'Updates' && notifications.filter(n => n.type === 'update' && !read.has(n.id)).length > 0 && (
              <span className="nav-count" style={{ marginLeft: '6px', fontSize: '10px', padding: '1px 6px' }}>
                {notifications.filter(n => n.type === 'update' && !read.has(n.id)).length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="notification-list">
        {shown.map(n => {
          const isRead = read.has(n.id)
          return (
            <button
              className={`notification ${isRead ? '' : 'unread'}`}
              key={n.id}
              onClick={() => markOne(n.id, n.issueId)}
              style={{ textAlign: 'left', width: '100%', cursor: 'pointer' }}
            >
              <span className={`notify-icon ${n.icon}`}>
                {n.icon === 'support' ? (
                  <ThumbsUp size={16} />
                ) : n.icon === 'comment' ? (
                  <MessageCircle size={16} />
                ) : n.icon === 'resolved' ? (
                  <CheckCircle2 size={16} />
                ) : (
                  <Clock3 size={16} />
                )}
              </span>
              <span className="notification-copy">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <b>{n.text}</b>
                  {n.type === 'mention' && (
                    <span style={{ fontSize: '9px', fontWeight: 800, background: '#eff6ff', color: '#1d4ed8', padding: '1px 6px', borderRadius: '4px' }}>
                      Mention
                    </span>
                  )}
                  {n.type === 'update' && (
                    <span style={{ fontSize: '9px', fontWeight: 800, background: '#ecfdf5', color: '#047857', padding: '1px 6px', borderRadius: '4px' }}>
                      Update
                    </span>
                  )}
                </div>
                <p>{n.detail}</p>
                <small>{n.time} ago</small>
              </span>
              {!isRead && <i aria-label="Unread" />}
            </button>
          )
        })}

        {shown.length === 0 && (
          <div className="empty" style={{ margin: '30px 0', padding: '50px 20px' }}>
            <Bell size={38} color="#94a3b8" />
            <h3 style={{ marginTop: '14px' }}>No notifications here</h3>
            <p>
              {tab === 'Mentions'
                ? 'You have not been mentioned in any comments yet.'
                : tab === 'Updates'
                ? 'No updates on your reported civic issues right now.'
                : 'You are all caught up! When someone mentions you or your reported issue status updates, it will appear here.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
