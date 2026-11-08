import { useMemo, useState } from 'react'
import { AlertCircle, Ban, CheckCircle2, ChevronRight, Clock3, FileCheck, FileText, LayoutDashboard, LogOut, MapPin, Send, Settings, ShieldAlert, Tags, Trash2, Users, X } from 'lucide-react'
import { categories, type Issue } from './data'

type View = 'dashboard' | 'approval' | 'posts' | 'users' | 'categories'
type Props = {
  items: Issue[]
  forward: (issue: Issue) => Promise<void>
  remove: (issue: Issue) => Promise<void>
  ban: (issue: Issue) => Promise<void>
  updateStatus: (issue: Issue, status: Issue['status']) => Promise<void>
  approvePost: (issue: Issue) => Promise<void>
  rejectPost: (issue: Issue) => Promise<void>
  logout: () => Promise<void>
}

const status = (issue: Issue) => `status ${issue.status.toLowerCase().replaceAll(' ', '-')}`

export default function CCExperience({
  items,
  forward,
  remove,
  ban,
  updateStatus,
  approvePost,
  rejectPost,
  logout
}: Props) {
  const [view, setView] = useState<View>('dashboard')
  const [category, setCategory] = useState('All issues')
  const [modal, setModal] = useState<Issue | null>(null)

  const pendingPosts = useMemo(() => items.filter(item => item.isApproved === false && !item.rejected), [items])
  const approvedPosts = useMemo(() => items.filter(item => item.isApproved !== false), [items])

  const users = useMemo(
    () =>
      Object.values(
        items.reduce<Record<string, { name: string; handle: string; avatar: string; items: Issue[] }>>((all, item) => {
          const person = all[item.handle] || { name: item.author, handle: item.handle, avatar: item.avatar, items: [] }
          person.items.push(item)
          all[item.handle] = person
          return all
        }, {})
      ),
    [items]
  )

  const visible = category === 'All issues' ? items : items.filter(item => item.category === category)

  return (
    <main className="ccx-shell">
      <aside className="ccx-sidebar">
        <div className="ccx-brand">
          <img src="/nagorik-voice-logo.png" alt="Nagorik Voice" />
          <div>
            <span>NAGORIK VOICE</span>
            <b>City Corporation</b>
            <small>Officer workspace</small>
          </div>
        </div>
        <p>WORKSPACE</p>
        <Nav icon={LayoutDashboard} label="Dashboard" active={view === 'dashboard'} click={() => setView('dashboard')} />
        <Nav
          icon={FileCheck}
          label="Post Approval"
          count={pendingPosts.length}
          active={view === 'approval'}
          click={() => setView('approval')}
          isAlert={pendingPosts.length > 0}
        />
        <Nav icon={FileText} label="Daily posts" count={items.length} active={view === 'posts'} click={() => setView('posts')} />
        <Nav icon={Users} label="User details" count={users.length} active={view === 'users'} click={() => setView('users')} />
        <Nav icon={Tags} label="Categories" active={view === 'categories'} click={() => setView('categories')} />

        <div className="ccx-bottom">
          <button className="ccx-settings" onClick={() => window.location.assign('/cc/settings')}>
            <Settings size={18} /> Portal settings
          </button>
          <button className="ccx-logout" onClick={logout}>
            <LogOut size={18} /> Log out
          </button>
        </div>
      </aside>

      <section className="ccx-content">
        <header className="ccx-header">
          <div>
            <span className="eyebrow">CITY CORPORATION CONTROL</span>
            <h1>
              {view === 'dashboard'
                ? 'Daily operations dashboard'
                : view === 'approval'
                ? 'Post Approval System'
                : view === 'posts'
                ? 'Daily citizen posts'
                : view === 'users'
                ? 'Citizen user details'
                : 'Category management'}
            </h1>
            <p>
              {view === 'approval'
                ? 'Review and approve pending citizen posts before they go live on the public feed.'
                : view === 'dashboard'
                ? 'Review incoming civic issues, pending approvals, and case escalation in one place.'
                : 'Live data from Nagorik Voice.'}
            </p>
          </div>
          <div className="ccx-officer">
            <span className="avatar">CC</span>
            <span>
              <b>CC Officer</b>
              <small>Dhaka City Corporation</small>
            </span>
          </div>
        </header>

        {view === 'dashboard' && (
          <Dashboard
            items={items}
            pendingCount={pendingPosts.length}
            approvedCount={approvedPosts.length}
            open={setModal}
            setView={setView}
          />
        )}
        {view === 'approval' && (
          <ApprovalSection
            pending={pendingPosts}
            open={setModal}
            approve={approvePost}
            reject={rejectPost}
          />
        )}
        {view === 'posts' && (
          <Posts
            items={visible}
            open={setModal}
            category={category}
            setCategory={setCategory}
            approve={approvePost}
            reject={rejectPost}
          />
        )}
        {view === 'users' && <UsersPage users={users} open={setModal} ban={ban} />}
        {view === 'categories' && (
          <Categories items={items} category={category} setCategory={setCategory} open={setModal} />
        )}
      </section>

      {modal && (
        <FullPost
          issue={modal}
          close={() => setModal(null)}
          forward={forward}
          remove={remove}
          ban={ban}
          updateStatus={updateStatus}
          approvePost={approvePost}
          rejectPost={rejectPost}
        />
      )}
    </main>
  )
}

function Nav({
  icon: Icon,
  label,
  active,
  click,
  count,
  isAlert
}: {
  icon: any
  label: string
  active: boolean
  click: () => void
  count?: number
  isAlert?: boolean
}) {
  return (
    <button className={`ccx-nav ${active ? 'active' : ''} ${isAlert ? 'has-badge' : ''}`} onClick={click}>
      <Icon size={19} />
      <span>{label}</span>
      {count !== undefined && (
        <i className={isAlert ? 'badge-alert' : ''}>{count}</i>
      )}
    </button>
  )
}

function Dashboard({
  items,
  pendingCount,
  approvedCount,
  open,
  setView
}: {
  items: Issue[]
  pendingCount: number
  approvedCount: number
  open: (item: Issue) => void
  setView: (view: View) => void
}) {
  return (
    <>
      <div className="ccx-stats">
        <div className={`ccx-metric ${pendingCount > 0 ? 'alert-metric' : ''}`} onClick={() => setView('approval')} style={{ cursor: 'pointer' }}>
          <b>{pendingCount}</b>
          <span>Pending approval</span>
        </div>
        <Metric value={approvedCount} label="Live on feed" />
        <Metric value={items.filter(i => i.sentToGovernment).length} label="Sent to Govt" />
        <Metric value={items.filter(i => i.governmentApproval).length} label="Approved work" />
      </div>

      {pendingCount > 0 && (
        <div className="ccx-approval-banner">
          <div>
            <ShieldAlert size={22} color="#b7791f" />
            <span>
              <strong>{pendingCount} citizen report{pendingCount > 1 ? 's' : ''}</strong> waiting for CC Admin approval before being published to the public feed.
            </span>
          </div>
          <button onClick={() => setView('approval')}>Review & Approve →</button>
        </div>
      )}

      <section className="ccx-card">
        <div className="ccx-card-head">
          <div>
            <h2>Recent daily posts</h2>
            <p>Click a post to open its full report.</p>
          </div>
          <button onClick={() => setView('posts')}>
            View all <ChevronRight size={17} />
          </button>
        </div>
        <Rows items={items.slice(0, 6)} open={open} />
      </section>
    </>
  )
}

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <div className="ccx-metric">
      <b>{value}</b>
      <span>{label}</span>
    </div>
  )
}

function Rows({ items, open }: { items: Issue[]; open: (item: Issue) => void }) {
  return (
    <div className="ccx-post-rows">
      {items.length ? (
        items.map(item => (
          <button className="ccx-post-row" key={item.id} onClick={() => open(item)}>
            {item.image ? <img src={item.image} alt="" /> : <span className="avatar">{item.avatar}</span>}
            <span>
              <b>{item.title}</b>
              <small>
                {item.author} · {item.location}
              </small>
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {item.isApproved === false ? (
                <span className="post-approval-status-tag pending" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Clock3 size={11} /> Pending
                </span>
              ) : (
                <span className="post-approval-status-tag approved" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={11} /> Live
                </span>
              )}
              <em className={status(item)}>{item.status}</em>
            </div>
            <ChevronRight size={18} />
          </button>
        ))
      ) : (
        <div className="empty">
          <FileText />
          <h3>No posts found.</h3>
          <p>New citizen reports will appear here.</p>
        </div>
      )}
    </div>
  )
}

function ApprovalSection({
  pending,
  open,
  approve,
  reject
}: {
  pending: Issue[]
  open: (item: Issue) => void
  approve: (item: Issue) => Promise<void>
  reject: (item: Issue) => Promise<void>
}) {
  return (
    <section className="ccx-card" style={{ padding: '22px' }}>
      <div className="ccx-card-head">
        <div>
          <h2>Pending Post Approvals ({pending.length})</h2>
          <p>These posts are held until you approve them. Approved posts appear live on the public feed.</p>
        </div>
      </div>

      {pending.length === 0 ? (
        <div className="empty" style={{ margin: '20px 0', padding: '60px' }}>
          <CheckCircle2 size={44} color="#16a34a" />
          <h3 style={{ marginTop: '12px' }}>All caught up!</h3>
          <p>There are no pending posts awaiting approval right now. New submissions will appear here.</p>
        </div>
      ) : (
        <div className="ccx-approval-grid">
          {pending.map(item => (
            <article className="ccx-approval-card" key={item.id}>
              {item.image ? (
                <img src={item.image} alt={item.title} className="approval-photo" />
              ) : (
                <div className="approval-photo" style={{ display: 'grid', placeItems: 'center', color: '#94a3b8' }}>
                  <FileText size={36} />
                </div>
              )}
              <div className="approval-body">
                <div className="approval-badges">
                  <span className="badge-pending" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Clock3 size={11} /> Needs Review
                  </span>
                  <span className="category">{item.category}</span>
                  <span className={`severity ${item.severity.toLowerCase()}`}>{item.severity}</span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <div className="approval-meta">
                  <MapPin size={14} />
                  <span>{item.location}</span>
                  <span style={{ marginLeft: 'auto' }}>by {item.author}</span>
                </div>
              </div>
              <div className="approval-actions">
                <button
                  type="button"
                  className="btn-approve"
                  onClick={async () => {
                    await approve(item)
                  }}
                >
                  <CheckCircle2 size={16} /> Approve & Publish
                </button>
                <button
                  type="button"
                  className="btn-reject"
                  onClick={async () => {
                    await reject(item)
                  }}
                >
                  <X size={16} /> Reject
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

function Posts({
  items,
  open,
  category,
  setCategory,
  approve,
  reject
}: {
  items: Issue[]
  open: (item: Issue) => void
  category: string
  setCategory: (value: string) => void
  approve: (item: Issue) => Promise<void>
  reject: (item: Issue) => Promise<void>
}) {
  return (
    <section className="ccx-card">
      <div className="ccx-card-head">
        <div>
          <h2>All daily posts</h2>
          <p>Select any report for its full-screen details.</p>
        </div>
        <select value={category} onChange={e => setCategory(e.target.value)}>
          <option>All issues</option>
          {categories.slice(1).map(item => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </div>
      <Rows items={items} open={open} />
    </section>
  )
}

function UsersPage({
  users,
  open,
  ban
}: {
  users: { name: string; handle: string; avatar: string; items: Issue[] }[]
  open: (item: Issue) => void
  ban: (item: Issue) => Promise<void>
}) {
  const [active, setActive] = useState(users[0]?.handle)
  const user = users.find(item => item.handle === active) || users[0]
  if (!user)
    return (
      <section className="ccx-card empty">
        <Users />
        <h3>No citizen users yet.</h3>
      </section>
    )
  return (
    <div className="ccx-user-layout">
      <section className="ccx-card">
        <div className="ccx-card-head">
          <div>
            <h2>User directory</h2>
            <p>Choose a citizen to inspect details.</p>
          </div>
        </div>
        <div className="ccx-user-rows">
          {users.map(item => (
            <button
              className={item.handle === user.handle ? 'active' : ''}
              key={item.handle}
              onClick={() => setActive(item.handle)}
            >
              <span className="avatar">{item.avatar}</span>
              <span>
                <b>{item.name}</b>
                <small>
                  @{item.handle} · {item.items.length} posts
                </small>
              </span>
              <ChevronRight size={17} />
            </button>
          ))}
        </div>
      </section>
      <aside className="ccx-user-detail">
        <div className="ccx-user-identity">
          <span className="avatar">{user.avatar}</span>
          <div>
            <h2>{user.name}</h2>
            <p>@{user.handle}</p>
          </div>
        </div>
        <h3>Account details</h3>
        <Info label="Reports submitted" value={`${user.items.length} posts`} />
        <Info label="Latest report" value={user.items[0].time} />
        <Info label="Location" value={user.items[0].location} />
        <div className="ccx-user-actions">
          <button className="primary" onClick={() => open(user.items[0])}>
            <FileText size={16} /> View post
          </button>
          <button className="ccx-danger" onClick={() => ban(user.items[0])}>
            <Ban size={16} /> Ban user
          </button>
        </div>
      </aside>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="ccx-info">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  )
}

function Categories({
  items,
  category,
  setCategory,
  open
}: {
  items: Issue[]
  category: string
  setCategory: (value: string) => void
  open: (item: Issue) => void
}) {
  const filtered = category === 'All issues' ? items : items.filter(item => item.category === category)
  return (
    <>
      <section className="ccx-category-grid">
        {categories.slice(1).map(item => (
          <button className={category === item ? 'active' : ''} key={item} onClick={() => setCategory(item)}>
            <Tags />
            <b>{item}</b>
            <span>{items.filter(issue => issue.category === item).length} reports</span>
          </button>
        ))}
      </section>
      <section className="ccx-card">
        <div className="ccx-card-head">
          <div>
            <h2>{category === 'All issues' ? 'Choose a category' : category}</h2>
            <p>{filtered.length} reports</p>
          </div>
          <button onClick={() => setCategory('All issues')}>Clear filter</button>
        </div>
        <Rows items={filtered} open={open} />
      </section>
    </>
  )
}

function FullPost({
  issue,
  close,
  forward,
  remove,
  ban,
  updateStatus,
  approvePost,
  rejectPost
}: {
  issue: Issue
  close: () => void
  forward: (issue: Issue) => Promise<void>
  remove: (issue: Issue) => Promise<void>
  ban: (issue: Issue) => Promise<void>
  updateStatus: (issue: Issue, status: Issue['status']) => Promise<void>
  approvePost: (issue: Issue) => Promise<void>
  rejectPost: (issue: Issue) => Promise<void>
}) {
  return (
    <div className="ccx-modal">
      <article>
        <header>
          <div>
            <span className="eyebrow">CITIZEN REPORT</span>
            <h1>Post details</h1>
          </div>
          <button onClick={close} aria-label="Close">
            <X />
          </button>
        </header>
        <div className="ccx-modal-body">
          {issue.image && <img src={issue.image} alt={issue.title} />}
          <section>
            {issue.isApproved === false && (
              <div
                style={{
                  background: '#fef3c7',
                  border: '1px solid #fde68a',
                  color: '#92400e',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  marginBottom: '12px',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <AlertCircle size={18} />
                <span>
                  <strong>PENDING APPROVAL:</strong> This post is waiting for CC Admin approval and is not yet visible on the public feed.
                </span>
              </div>
            )}

            <div className="ccx-modal-tags">
              <span className="category">{issue.category}</span>
              <em className={status(issue)}>{issue.status}</em>
              <span>{issue.severity} severity</span>
              {issue.isApproved === false ? (
                <span className="post-approval-status-tag pending" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Clock3 size={11} /> Pending CC Review
                </span>
              ) : (
                <span className="post-approval-status-tag approved" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={11} /> Publicly Approved
                </span>
              )}
            </div>

            <h2>{issue.title}</h2>
            <p>{issue.description}</p>

            <div className="ccx-modal-user">
              <span className="avatar">{issue.avatar}</span>
              <div>
                <b>{issue.author}</b>
                <small>@{issue.handle} · Citizen report</small>
              </div>
            </div>

            <div className="ccx-location">
              <MapPin size={17} />
              <span>{issue.location}</span>
            </div>

            <label className="ccx-status-control">
              <span>CC case status</span>
              <select value={issue.status} onChange={e => updateStatus(issue, e.target.value as Issue['status'])}>
                {['Reported', 'Acknowledged', 'Under Review', 'In Progress', 'Resolved'].map(value => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>

            <div className="ccx-modal-actions">
              {issue.isApproved === false ? (
                <>
                  <button
                    className="primary"
                    style={{ background: '#16a34a' }}
                    onClick={async () => {
                      await approvePost(issue)
                      close()
                    }}
                  >
                    <CheckCircle2 size={17} /> Approve & Publish
                  </button>
                  <button
                    className="btn-reject"
                    onClick={async () => {
                      await rejectPost(issue)
                      close()
                    }}
                  >
                    <X size={17} /> Reject Post
                  </button>
                </>
              ) : (
                <>
                  {issue.sentToGovernment ? (
                    <span className="sent-label">
                      <CheckCircle2 size={17} /> Sent to Government
                    </span>
                  ) : (
                    <button className="primary" onClick={() => forward(issue)}>
                      <Send size={17} /> Send to Government
                    </button>
                  )}
                  <button className="outline danger" onClick={() => remove(issue)}>
                    <Trash2 size={17} /> Delete post
                  </button>
                </>
              )}
              <button className="ccx-danger" onClick={() => ban(issue)}>
                <Ban size={17} /> Ban user
              </button>
            </div>
          </section>
        </div>
      </article>
    </div>
  )
}
