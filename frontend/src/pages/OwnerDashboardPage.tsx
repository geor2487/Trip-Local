import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ownerApi } from '../lib/api';
import { useAuth } from '../lib/auth-context';
import '../styles/owner.css';

/* ── Types ── */
interface Accommodation {
  id: string;
  name: string;
  description: string;
  address: string;
  city: string;
  prefecture: string;
  zipCode: string;
  amenities: string[];
  status: string;
  roomCount: number;
}

interface Room {
  id: string;
  name: string;
  description: string;
  capacity: number;
  pricePerNight: number;
}

interface Booking {
  id: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalPrice: number;
  status: string;
  roomName: string;
}

interface AccommodationFormData {
  name: string;
  description: string;
  address: string;
  city: string;
  prefecture: string;
  zipCode: string;
  amenities: string;
}

interface RoomFormData {
  name: string;
  description: string;
  capacity: string;
  pricePerNight: string;
}

interface OwnerDashboardPageProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

/* ── Constants ── */
type TabKey = 'accommodations' | 'bookings';

const EMPTY_ACC_FORM: AccommodationFormData = {
  name: '',
  description: '',
  address: '',
  city: '',
  prefecture: '',
  zipCode: '',
  amenities: '',
};

const EMPTY_ROOM_FORM: RoomFormData = {
  name: '',
  description: '',
  capacity: '',
  pricePerNight: '',
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: '公開中',
  PENDING: '審査中',
  REJECTED: '非承認',
  DRAFT: '下書き',
};

const STATUS_CLS: Record<string, string> = {
  ACTIVE: 'owner-status-active',
  PENDING: 'owner-status-pending',
  REJECTED: 'owner-status-rejected',
  DRAFT: 'owner-status-draft',
};

const BOOKING_STATUS_LABELS: Record<string, string> = {
  PENDING: '決済待ち',
  CONFIRMED: '確定済み',
  COMPLETED: '滞在済み',
  CANCELLED: 'キャンセル',
};

/* ── Helpers ── */
function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

/* ── Component ── */
export function OwnerDashboardPage({ onNavigate }: OwnerDashboardPageProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Tab state
  const [tab, setTab] = useState<TabKey>('accommodations');

  // Modal & form states
  const [showAccModal, setShowAccModal] = useState(false);
  const [editingAcc, setEditingAcc] = useState<Accommodation | null>(null);
  const [accForm, setAccForm] = useState<AccommodationFormData>(EMPTY_ACC_FORM);

  const [showRoomModal, setShowRoomModal] = useState(false);
  const [roomModalAccId, setRoomModalAccId] = useState<string | null>(null);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [roomForm, setRoomForm] = useState<RoomFormData>(EMPTY_ROOM_FORM);

  // Expandable rooms
  const [expandedAccId, setExpandedAccId] = useState<string | null>(null);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Booking tab
  const [selectedAccId, setSelectedAccId] = useState<string>('');

  // Error state
  const [formError, setFormError] = useState<string | null>(null);

  /* ── Queries ── */
  const accommodationsQuery = useQuery({
    queryKey: ['owner', 'accommodations'],
    queryFn: () => ownerApi.listAccommodations(),
    enabled: !!user,
  });

  const roomsQuery = useQuery({
    queryKey: ['owner', 'rooms', expandedAccId],
    queryFn: () => ownerApi.listRooms(expandedAccId!),
    enabled: !!expandedAccId,
  });

  const bookingsQuery = useQuery({
    queryKey: ['owner', 'bookings', selectedAccId],
    queryFn: () => ownerApi.listBookings(selectedAccId),
    enabled: !!selectedAccId,
  });

  /* ── Mutations ── */
  const createAccMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => ownerApi.createAccommodation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner', 'accommodations'] });
      closeAccModal();
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const updateAccMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      ownerApi.updateAccommodation(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner', 'accommodations'] });
      closeAccModal();
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const deleteAccMutation = useMutation({
    mutationFn: (id: string) => ownerApi.deleteAccommodation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner', 'accommodations'] });
      setDeleteTarget(null);
      if (expandedAccId === deleteTarget) setExpandedAccId(null);
    },
  });

  const createRoomMutation = useMutation({
    mutationFn: ({ accId, data }: { accId: string; data: Record<string, unknown> }) =>
      ownerApi.createRoom(accId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner', 'rooms', roomModalAccId] });
      queryClient.invalidateQueries({ queryKey: ['owner', 'accommodations'] });
      closeRoomModal();
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const updateRoomMutation = useMutation({
    mutationFn: ({ accId, roomId, data }: { accId: string; roomId: string; data: Record<string, unknown> }) =>
      ownerApi.updateRoom(accId, roomId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner', 'rooms', roomModalAccId] });
      closeRoomModal();
    },
    onError: (err: Error) => setFormError(err.message),
  });

  /* ── Modal Handlers ── */
  function openCreateAccModal() {
    setEditingAcc(null);
    setAccForm(EMPTY_ACC_FORM);
    setFormError(null);
    setShowAccModal(true);
  }

  function openEditAccModal(acc: Accommodation) {
    setEditingAcc(acc);
    setAccForm({
      name: acc.name,
      description: acc.description,
      address: acc.address,
      city: acc.city,
      prefecture: acc.prefecture,
      zipCode: acc.zipCode,
      amenities: acc.amenities.join(', '),
    });
    setFormError(null);
    setShowAccModal(true);
  }

  function closeAccModal() {
    setShowAccModal(false);
    setEditingAcc(null);
    setAccForm(EMPTY_ACC_FORM);
    setFormError(null);
  }

  function openCreateRoomModal(accId: string) {
    setRoomModalAccId(accId);
    setEditingRoom(null);
    setRoomForm(EMPTY_ROOM_FORM);
    setFormError(null);
    setShowRoomModal(true);
  }

  function openEditRoomModal(accId: string, room: Room) {
    setRoomModalAccId(accId);
    setEditingRoom(room);
    setRoomForm({
      name: room.name,
      description: room.description,
      capacity: String(room.capacity),
      pricePerNight: String(room.pricePerNight),
    });
    setFormError(null);
    setShowRoomModal(true);
  }

  function closeRoomModal() {
    setShowRoomModal(false);
    setRoomModalAccId(null);
    setEditingRoom(null);
    setRoomForm(EMPTY_ROOM_FORM);
    setFormError(null);
  }

  /* ── Form Submits ── */
  function handleAccSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const payload = {
      name: accForm.name.trim(),
      description: accForm.description.trim(),
      address: accForm.address.trim(),
      city: accForm.city.trim(),
      prefecture: accForm.prefecture.trim(),
      zipCode: accForm.zipCode.trim(),
      amenities: accForm.amenities
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    };

    if (!payload.name) {
      setFormError('施設名を入力してください');
      return;
    }

    if (editingAcc) {
      updateAccMutation.mutate({ id: editingAcc.id, data: payload });
    } else {
      createAccMutation.mutate(payload);
    }
  }

  function handleRoomSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!roomModalAccId) return;

    const payload = {
      name: roomForm.name.trim(),
      description: roomForm.description.trim(),
      capacity: Number(roomForm.capacity),
      pricePerNight: Number(roomForm.pricePerNight),
    };

    if (!payload.name) {
      setFormError('部屋名を入力してください');
      return;
    }
    if (!payload.capacity || payload.capacity < 1) {
      setFormError('定員を正しく入力してください');
      return;
    }
    if (!payload.pricePerNight || payload.pricePerNight < 0) {
      setFormError('価格を正しく入力してください');
      return;
    }

    if (editingRoom) {
      updateRoomMutation.mutate({ accId: roomModalAccId, roomId: editingRoom.id, data: payload });
    } else {
      createRoomMutation.mutate({ accId: roomModalAccId, data: payload });
    }
  }

  /* ── Toggle Rooms ── */
  function toggleRooms(accId: string) {
    setExpandedAccId((prev) => (prev === accId ? null : accId));
  }

  /* ── Guard ── */
  if (!user) {
    return (
      <div className="owner-empty" style={{ paddingTop: 120 }}>
        <p>オーナーダッシュボードにはログインが必要です</p>
        <button className="owner-add-btn" onClick={() => onNavigate('login')}>
          ログイン
        </button>
      </div>
    );
  }

  const accommodations: Accommodation[] = accommodationsQuery.data?.data ?? accommodationsQuery.data ?? [];
  const rooms: Room[] = roomsQuery.data?.data ?? roomsQuery.data ?? [];
  const bookings: Booking[] = bookingsQuery.data?.data ?? bookingsQuery.data ?? [];

  const isMutating =
    createAccMutation.isPending ||
    updateAccMutation.isPending ||
    createRoomMutation.isPending ||
    updateRoomMutation.isPending;

  /* ── Render ── */
  return (
    <div className="owner-page">
      {/* Header */}
      <div className="owner-header">
        <h1 className="owner-title">オーナーダッシュボード</h1>
        <p className="owner-sub">
          {user.name} さんの施設管理
        </p>
      </div>

      {/* Tabs */}
      <div className="owner-tabs">
        <button
          className={`owner-tab${tab === 'accommodations' ? ' active' : ''}`}
          onClick={() => setTab('accommodations')}
        >
          施設管理
        </button>
        <button
          className={`owner-tab${tab === 'bookings' ? ' active' : ''}`}
          onClick={() => setTab('bookings')}
        >
          予約管理
        </button>
      </div>

      {/* ════ Accommodations Tab ════ */}
      {tab === 'accommodations' && (
        <>
          <div className="owner-toolbar">
            <span className="owner-toolbar-label">
              登録施設: {accommodations.length}件
            </span>
            <button className="owner-add-btn" onClick={openCreateAccModal}>
              施設を追加
            </button>
          </div>

          {accommodationsQuery.isLoading ? (
            <div className="owner-loading">読み込み中...</div>
          ) : accommodations.length === 0 ? (
            <div className="owner-empty">
              <p>まだ施設が登録されていません</p>
              <button className="owner-add-btn" onClick={openCreateAccModal}>
                最初の施設を追加
              </button>
            </div>
          ) : (
            <div>
              {accommodations.map((acc) => {
                const statusLabel = STATUS_LABELS[acc.status] || acc.status;
                const statusCls = STATUS_CLS[acc.status] || 'owner-status-draft';
                const isExpanded = expandedAccId === acc.id;

                return (
                  <div key={acc.id} className="acc-card">
                    <div className="acc-card-main">
                      <div className="acc-card-info">
                        <div className="acc-card-top">
                          <span className="acc-card-name">{acc.name}</span>
                          <span className={`owner-status ${statusCls}`}>{statusLabel}</span>
                        </div>
                        <p className="acc-card-meta">
                          {acc.prefecture} {acc.city} ・ 部屋数: {acc.roomCount ?? 0}
                        </p>
                        {acc.amenities.length > 0 && (
                          <div className="acc-card-amenities">
                            {acc.amenities.slice(0, 5).map((a) => (
                              <span key={a} className="amenity-chip">{a}</span>
                            ))}
                            {acc.amenities.length > 5 && (
                              <span className="amenity-chip">+{acc.amenities.length - 5}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="acc-card-actions">
                        <button
                          className="acc-action-btn"
                          onClick={() => openEditAccModal(acc)}
                        >
                          編集
                        </button>
                        <button
                          className="acc-action-btn primary"
                          onClick={() => toggleRooms(acc.id)}
                        >
                          {isExpanded ? '部屋を閉じる' : '部屋管理'}
                        </button>
                        {deleteTarget === acc.id ? (
                          <div className="delete-confirm">
                            <span className="delete-confirm-text">本当に削除しますか？</span>
                            <button
                              className="acc-action-btn danger"
                              onClick={() => deleteAccMutation.mutate(acc.id)}
                              disabled={deleteAccMutation.isPending}
                            >
                              {deleteAccMutation.isPending ? '...' : '削除'}
                            </button>
                            <button
                              className="acc-action-btn"
                              onClick={() => setDeleteTarget(null)}
                            >
                              戻る
                            </button>
                          </div>
                        ) : (
                          <button
                            className="acc-action-btn danger"
                            onClick={() => setDeleteTarget(acc.id)}
                          >
                            削除
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expandable Rooms Section */}
                    {isExpanded && (
                      <div className="rooms-section">
                        <div className="rooms-header">
                          <span className="rooms-title">部屋一覧</span>
                          <button
                            className="rooms-add-btn"
                            onClick={() => openCreateRoomModal(acc.id)}
                          >
                            部屋を追加
                          </button>
                        </div>
                        {roomsQuery.isLoading ? (
                          <div className="rooms-empty">読み込み中...</div>
                        ) : rooms.length === 0 ? (
                          <div className="rooms-empty">部屋がまだ登録されていません</div>
                        ) : (
                          rooms.map((room) => (
                            <div key={room.id} className="room-row">
                              <span className="room-name">{room.name}</span>
                              <span className="room-detail">定員 {room.capacity}名</span>
                              <span className="room-price">
                                ¥{room.pricePerNight.toLocaleString()}/泊
                              </span>
                              <button
                                className="room-edit-btn"
                                onClick={() => openEditRoomModal(acc.id, room)}
                              >
                                編集
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ════ Bookings Tab ════ */}
      {tab === 'bookings' && (
        <>
          <div className="booking-select-wrapper">
            <label className="booking-select-label">施設を選択</label>
            <select
              className="booking-select"
              value={selectedAccId}
              onChange={(e) => setSelectedAccId(e.target.value)}
            >
              <option value="">-- 施設を選択してください --</option>
              {accommodations.map((acc) => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
          </div>

          {!selectedAccId ? (
            <div className="owner-empty">
              施設を選択すると予約一覧が表示されます
            </div>
          ) : bookingsQuery.isLoading ? (
            <div className="owner-loading">読み込み中...</div>
          ) : bookings.length === 0 ? (
            <div className="owner-empty">この施設にはまだ予約がありません</div>
          ) : (
            <div>
              {bookings.map((bk) => {
                const statusLabel = BOOKING_STATUS_LABELS[bk.status] || bk.status;
                return (
                  <div key={bk.id} className="booking-card">
                    <div className="booking-info">
                      <p className="booking-guest">{bk.guestName}</p>
                      <p className="booking-dates">
                        {formatDate(bk.checkIn)} ~ {formatDate(bk.checkOut)}
                        {bk.roomName && ` ・ ${bk.roomName}`}
                        {bk.guests > 0 && ` ・ ${bk.guests}名`}
                      </p>
                    </div>
                    <span className={`booking-status booking-status-${bk.status}`}>
                      {statusLabel}
                    </span>
                    <span className="booking-price">
                      ¥{bk.totalPrice.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ════ Accommodation Modal ════ */}
      {showAccModal && (
        <div className="owner-modal-overlay" onClick={closeAccModal}>
          <div className="owner-modal" onClick={(e) => e.stopPropagation()}>
            <button className="owner-modal-close" onClick={closeAccModal}>
              ×
            </button>
            <h2>{editingAcc ? '施設を編集' : '施設を追加'}</h2>

            {formError && <div className="owner-error">{formError}</div>}

            <form onSubmit={handleAccSubmit}>
              <div className="owner-form-group">
                <label className="owner-form-label">施設名</label>
                <input
                  className="owner-form-input"
                  type="text"
                  value={accForm.name}
                  onChange={(e) => setAccForm({ ...accForm, name: e.target.value })}
                  placeholder="例: 古民家ゲストハウス 風の道"
                />
              </div>

              <div className="owner-form-group">
                <label className="owner-form-label">説明</label>
                <textarea
                  className="owner-form-textarea"
                  value={accForm.description}
                  onChange={(e) => setAccForm({ ...accForm, description: e.target.value })}
                  placeholder="施設の特徴や魅力を記入してください"
                />
              </div>

              <div className="owner-form-group">
                <label className="owner-form-label">住所</label>
                <input
                  className="owner-form-input"
                  type="text"
                  value={accForm.address}
                  onChange={(e) => setAccForm({ ...accForm, address: e.target.value })}
                  placeholder="例: 大字〇〇123-4"
                />
              </div>

              <div className="owner-form-row">
                <div className="owner-form-group">
                  <label className="owner-form-label">市区町村</label>
                  <input
                    className="owner-form-input"
                    type="text"
                    value={accForm.city}
                    onChange={(e) => setAccForm({ ...accForm, city: e.target.value })}
                    placeholder="例: 白川村"
                  />
                </div>
                <div className="owner-form-group">
                  <label className="owner-form-label">都道府県</label>
                  <input
                    className="owner-form-input"
                    type="text"
                    value={accForm.prefecture}
                    onChange={(e) => setAccForm({ ...accForm, prefecture: e.target.value })}
                    placeholder="例: 岐阜県"
                  />
                </div>
              </div>

              <div className="owner-form-group">
                <label className="owner-form-label">郵便番号</label>
                <input
                  className="owner-form-input"
                  type="text"
                  value={accForm.zipCode}
                  onChange={(e) => setAccForm({ ...accForm, zipCode: e.target.value })}
                  placeholder="例: 501-5627"
                />
              </div>

              <div className="owner-form-group">
                <label className="owner-form-label">アメニティ</label>
                <input
                  className="owner-form-input"
                  type="text"
                  value={accForm.amenities}
                  onChange={(e) => setAccForm({ ...accForm, amenities: e.target.value })}
                  placeholder="例: Wi-Fi, 温泉, 駐車場, 朝食付き"
                />
                <p className="owner-form-hint">カンマ区切りで入力してください</p>
              </div>

              <div className="owner-form-actions">
                <button
                  type="button"
                  className="owner-form-cancel"
                  onClick={closeAccModal}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="owner-form-submit"
                  disabled={isMutating}
                >
                  {isMutating ? '保存中...' : editingAcc ? '更新する' : '追加する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════ Room Modal ════ */}
      {showRoomModal && (
        <div className="owner-modal-overlay" onClick={closeRoomModal}>
          <div className="owner-modal" onClick={(e) => e.stopPropagation()}>
            <button className="owner-modal-close" onClick={closeRoomModal}>
              ×
            </button>
            <h2>{editingRoom ? '部屋を編集' : '部屋を追加'}</h2>

            {formError && <div className="owner-error">{formError}</div>}

            <form onSubmit={handleRoomSubmit}>
              <div className="owner-form-group">
                <label className="owner-form-label">部屋名</label>
                <input
                  className="owner-form-input"
                  type="text"
                  value={roomForm.name}
                  onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
                  placeholder="例: 和室 8畳"
                />
              </div>

              <div className="owner-form-group">
                <label className="owner-form-label">説明</label>
                <textarea
                  className="owner-form-textarea"
                  value={roomForm.description}
                  onChange={(e) => setRoomForm({ ...roomForm, description: e.target.value })}
                  placeholder="部屋の特徴を記入してください"
                />
              </div>

              <div className="owner-form-row">
                <div className="owner-form-group">
                  <label className="owner-form-label">定員（名）</label>
                  <input
                    className="owner-form-input"
                    type="number"
                    min="1"
                    value={roomForm.capacity}
                    onChange={(e) => setRoomForm({ ...roomForm, capacity: e.target.value })}
                    placeholder="例: 4"
                  />
                </div>
                <div className="owner-form-group">
                  <label className="owner-form-label">1泊あたりの価格（円）</label>
                  <input
                    className="owner-form-input"
                    type="number"
                    min="0"
                    value={roomForm.pricePerNight}
                    onChange={(e) => setRoomForm({ ...roomForm, pricePerNight: e.target.value })}
                    placeholder="例: 12000"
                  />
                </div>
              </div>

              <div className="owner-form-actions">
                <button
                  type="button"
                  className="owner-form-cancel"
                  onClick={closeRoomModal}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="owner-form-submit"
                  disabled={isMutating}
                >
                  {isMutating ? '保存中...' : editingRoom ? '更新する' : '追加する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
