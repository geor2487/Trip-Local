import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ownerApi } from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { translateAmenity } from '../lib/amenity-i18n';
import { tPrefecture, tCity, tName, tRoom } from '../lib/content-i18n';
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

const STATUS_CLS: Record<string, string> = {
  ACTIVE: 'owner-status-active',
  PENDING: 'owner-status-pending',
  REJECTED: 'owner-status-rejected',
  DRAFT: 'owner-status-draft',
};

/* ── Component ── */
export function OwnerDashboardPage({ onNavigate }: OwnerDashboardPageProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();

  /* ── Dynamic label helpers ── */
  const getStatusLabel = (status: string) => {
    const key = { ACTIVE: 'statusActive', PENDING: 'statusPending', REJECTED: 'statusRejected', DRAFT: 'statusDraft' }[status];
    return key ? t(`owner.${key}`) : status;
  };
  const getBookingStatusLabel = (status: string) => {
    const key = { PENDING: 'bookingPending', CONFIRMED: 'bookingConfirmed', COMPLETED: 'bookingCompleted', CANCELLED: 'bookingCancelled' }[status];
    return key ? t(`owner.${key}`) : status;
  };

  /* ── Locale-aware date formatter ── */
  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString(i18n.language, {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
  }

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
      setFormError(t('owner.formNameRequired'));
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
      setFormError(t('owner.formRoomNameRequired'));
      return;
    }
    if (!payload.capacity || payload.capacity < 1) {
      setFormError(t('owner.formCapacityRequired'));
      return;
    }
    if (!payload.pricePerNight || payload.pricePerNight < 0) {
      setFormError(t('owner.formPriceRequired'));
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
        <p>{t('owner.loginRequired')}</p>
        <button className="owner-add-btn" onClick={() => onNavigate('login')}>
          {t('common.login')}
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
        <h1 className="owner-title">{t('owner.title')}</h1>
        <p className="owner-sub">
          {t('owner.subtitle', { name: user.name })}
        </p>
      </div>

      {/* Tabs */}
      <div className="owner-tabs">
        <button
          className={`owner-tab${tab === 'accommodations' ? ' active' : ''}`}
          onClick={() => setTab('accommodations')}
        >
          {t('owner.tabs.accommodations')}
        </button>
        <button
          className={`owner-tab${tab === 'bookings' ? ' active' : ''}`}
          onClick={() => setTab('bookings')}
        >
          {t('owner.tabs.bookings')}
        </button>
      </div>

      {/* ════ Accommodations Tab ════ */}
      {tab === 'accommodations' && (
        <>
          <div className="owner-toolbar">
            <span className="owner-toolbar-label">
              {t('owner.registeredCount', { count: accommodations.length })}
            </span>
            <button className="owner-add-btn" onClick={openCreateAccModal}>
              {t('owner.addAccommodation')}
            </button>
          </div>

          {accommodationsQuery.isLoading ? (
            <div className="owner-loading">{t('common.loading')}</div>
          ) : accommodations.length === 0 ? (
            <div className="owner-empty">
              <p>{t('owner.noAccommodations')}</p>
              <button className="owner-add-btn" onClick={openCreateAccModal}>
                {t('owner.addFirst')}
              </button>
            </div>
          ) : (
            <div>
              {accommodations.map((acc) => {
                const statusLabel = getStatusLabel(acc.status);
                const statusCls = STATUS_CLS[acc.status] || 'owner-status-draft';
                const isExpanded = expandedAccId === acc.id;

                return (
                  <div key={acc.id} className="acc-card">
                    <div className="acc-card-main">
                      <div className="acc-card-info">
                        <div className="acc-card-top">
                          <span className="acc-card-name">{tName(acc.name, i18n.language)}</span>
                          <span className={`owner-status ${statusCls}`}>{statusLabel}</span>
                        </div>
                        <p className="acc-card-meta">
                          {tPrefecture(acc.prefecture, i18n.language)} {tCity(acc.city, i18n.language)} · {t('owner.roomCountLabel', { count: acc.roomCount ?? 0 })}
                        </p>
                        {acc.amenities.length > 0 && (
                          <div className="acc-card-amenities">
                            {acc.amenities.slice(0, 5).map((a) => (
                              <span key={a} className="amenity-chip">{translateAmenity(a, i18n.language)}</span>
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
                          {t('owner.edit')}
                        </button>
                        <button
                          className="acc-action-btn primary"
                          onClick={() => toggleRooms(acc.id)}
                        >
                          {isExpanded ? t('owner.closeRooms') : t('owner.manageRooms')}
                        </button>
                        {deleteTarget === acc.id ? (
                          <div className="delete-confirm">
                            <span className="delete-confirm-text">{t('owner.deleteConfirm')}</span>
                            <button
                              className="acc-action-btn danger"
                              onClick={() => deleteAccMutation.mutate(acc.id)}
                              disabled={deleteAccMutation.isPending}
                            >
                              {deleteAccMutation.isPending ? '...' : t('owner.delete')}
                            </button>
                            <button
                              className="acc-action-btn"
                              onClick={() => setDeleteTarget(null)}
                            >
                              {t('owner.back')}
                            </button>
                          </div>
                        ) : (
                          <button
                            className="acc-action-btn danger"
                            onClick={() => setDeleteTarget(acc.id)}
                          >
                            {t('owner.delete')}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expandable Rooms Section */}
                    {isExpanded && (
                      <div className="rooms-section">
                        <div className="rooms-header">
                          <span className="rooms-title">{t('owner.roomsList')}</span>
                          <button
                            className="rooms-add-btn"
                            onClick={() => openCreateRoomModal(acc.id)}
                          >
                            {t('owner.addRoom')}
                          </button>
                        </div>
                        {roomsQuery.isLoading ? (
                          <div className="rooms-empty">{t('common.loading')}</div>
                        ) : rooms.length === 0 ? (
                          <div className="rooms-empty">{t('owner.noRooms')}</div>
                        ) : (
                          rooms.map((room) => (
                            <div key={room.id} className="room-row">
                              <span className="room-name">{tRoom(room.name, i18n.language)}</span>
                              <span className="room-detail">{t('owner.roomCapacity', { count: room.capacity })}</span>
                              <span className="room-price">
                                ¥{room.pricePerNight.toLocaleString()}{i18n.language === 'ja' ? '〜' : '+'}
                              </span>
                              <button
                                className="room-edit-btn"
                                onClick={() => openEditRoomModal(acc.id, room)}
                              >
                                {t('owner.edit')}
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
            <label className="booking-select-label">{t('owner.selectFacility')}</label>
            <select
              className="booking-select"
              value={selectedAccId}
              onChange={(e) => setSelectedAccId(e.target.value)}
            >
              <option value="">{t('owner.selectFacilityPrompt')}</option>
              {accommodations.map((acc) => (
                <option key={acc.id} value={acc.id}>{tName(acc.name, i18n.language)}</option>
              ))}
            </select>
          </div>

          {!selectedAccId ? (
            <div className="owner-empty">
              {t('owner.selectToView')}
            </div>
          ) : bookingsQuery.isLoading ? (
            <div className="owner-loading">{t('common.loading')}</div>
          ) : bookings.length === 0 ? (
            <div className="owner-empty">{t('owner.noBookings')}</div>
          ) : (
            <div>
              {bookings.map((bk) => {
                const statusLabel = getBookingStatusLabel(bk.status);
                return (
                  <div key={bk.id} className="booking-card">
                    <div className="booking-info">
                      <p className="booking-guest">{tName(bk.guestName, i18n.language)}</p>
                      <p className="booking-dates">
                        {formatDate(bk.checkIn)} ~ {formatDate(bk.checkOut)}
                        {bk.roomName && ` · ${tRoom(bk.roomName, i18n.language)}`}
                        {bk.guests > 0 && ` · ${t('owner.guestsCount', { count: bk.guests })}`}
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
            <h2>{editingAcc ? t('owner.editTitle') : t('owner.addTitle')}</h2>

            {formError && <div className="owner-error">{formError}</div>}

            <form onSubmit={handleAccSubmit}>
              <div className="owner-form-group">
                <label className="owner-form-label">{t('owner.formName')}</label>
                <input
                  className="owner-form-input"
                  type="text"
                  value={accForm.name}
                  onChange={(e) => setAccForm({ ...accForm, name: e.target.value })}
                  placeholder={t('owner.formNamePlaceholder')}
                />
              </div>

              <div className="owner-form-group">
                <label className="owner-form-label">{t('owner.formDescription')}</label>
                <textarea
                  className="owner-form-textarea"
                  value={accForm.description}
                  onChange={(e) => setAccForm({ ...accForm, description: e.target.value })}
                  placeholder={t('owner.formDescriptionPlaceholder')}
                />
              </div>

              <div className="owner-form-group">
                <label className="owner-form-label">{t('owner.formAddress')}</label>
                <input
                  className="owner-form-input"
                  type="text"
                  value={accForm.address}
                  onChange={(e) => setAccForm({ ...accForm, address: e.target.value })}
                  placeholder={t('owner.formAddressPlaceholder')}
                />
              </div>

              <div className="owner-form-row">
                <div className="owner-form-group">
                  <label className="owner-form-label">{t('owner.formCity')}</label>
                  <input
                    className="owner-form-input"
                    type="text"
                    value={accForm.city}
                    onChange={(e) => setAccForm({ ...accForm, city: e.target.value })}
                    placeholder={t('owner.formCityPlaceholder')}
                  />
                </div>
                <div className="owner-form-group">
                  <label className="owner-form-label">{t('owner.formPrefecture')}</label>
                  <input
                    className="owner-form-input"
                    type="text"
                    value={accForm.prefecture}
                    onChange={(e) => setAccForm({ ...accForm, prefecture: e.target.value })}
                    placeholder={t('owner.formPrefecturePlaceholder')}
                  />
                </div>
              </div>

              <div className="owner-form-group">
                <label className="owner-form-label">{t('owner.formZipCode')}</label>
                <input
                  className="owner-form-input"
                  type="text"
                  value={accForm.zipCode}
                  onChange={(e) => setAccForm({ ...accForm, zipCode: e.target.value })}
                  placeholder={t('owner.formZipCodePlaceholder')}
                />
              </div>

              <div className="owner-form-group">
                <label className="owner-form-label">{t('owner.formAmenities')}</label>
                <input
                  className="owner-form-input"
                  type="text"
                  value={accForm.amenities}
                  onChange={(e) => setAccForm({ ...accForm, amenities: e.target.value })}
                  placeholder={t('owner.formAmenitiesPlaceholder')}
                />
                <p className="owner-form-hint">{t('owner.formAmenitiesHint')}</p>
              </div>

              <div className="owner-form-actions">
                <button
                  type="button"
                  className="owner-form-cancel"
                  onClick={closeAccModal}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="owner-form-submit"
                  disabled={isMutating}
                >
                  {isMutating ? t('owner.saving') : editingAcc ? t('owner.update') : t('owner.add')}
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
            <h2>{editingRoom ? t('owner.editRoomTitle') : t('owner.addRoomTitle')}</h2>

            {formError && <div className="owner-error">{formError}</div>}

            <form onSubmit={handleRoomSubmit}>
              <div className="owner-form-group">
                <label className="owner-form-label">{t('owner.formRoomName')}</label>
                <input
                  className="owner-form-input"
                  type="text"
                  value={roomForm.name}
                  onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
                  placeholder={t('owner.formRoomNamePlaceholder')}
                />
              </div>

              <div className="owner-form-group">
                <label className="owner-form-label">{t('owner.formRoomDescription')}</label>
                <textarea
                  className="owner-form-textarea"
                  value={roomForm.description}
                  onChange={(e) => setRoomForm({ ...roomForm, description: e.target.value })}
                  placeholder={t('owner.formRoomDescriptionPlaceholder')}
                />
              </div>

              <div className="owner-form-row">
                <div className="owner-form-group">
                  <label className="owner-form-label">{t('owner.formCapacity')}</label>
                  <input
                    className="owner-form-input"
                    type="number"
                    min="1"
                    value={roomForm.capacity}
                    onChange={(e) => setRoomForm({ ...roomForm, capacity: e.target.value })}
                    placeholder={t('owner.formCapacityPlaceholder')}
                  />
                </div>
                <div className="owner-form-group">
                  <label className="owner-form-label">{t('owner.formPricePerNight')}</label>
                  <input
                    className="owner-form-input"
                    type="number"
                    min="0"
                    value={roomForm.pricePerNight}
                    onChange={(e) => setRoomForm({ ...roomForm, pricePerNight: e.target.value })}
                    placeholder={t('owner.formPricePerNightPlaceholder')}
                  />
                </div>
              </div>

              <div className="owner-form-actions">
                <button
                  type="button"
                  className="owner-form-cancel"
                  onClick={closeRoomModal}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="owner-form-submit"
                  disabled={isMutating}
                >
                  {isMutating ? t('owner.saving') : editingRoom ? t('owner.update') : t('owner.add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
