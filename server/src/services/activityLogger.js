const { supabase } = require('./supabaseData');
const { insertActivityLogRow, insertAuditLogRow } = require('./auditStore');

const isMissingTableError = (error, tableName) => {
  const code = String(error?.code || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();
  const target = String(tableName || '').toLowerCase();

  if (code === 'pgrst205' || code === '42p01') {
    return true;
  }

  return (
    message.includes(target)
    && (
      message.includes('relation')
      || message.includes('schema cache')
      || message.includes('could not find the table')
      || message.includes('does not exist')
    )
  );
};

const toSafeObject = (value) => {
  if (!value || typeof value !== 'object') return {};
  return value;
};

const toAuditActionType = (actionType) => {
  const normalized = String(actionType || '').toLowerCase();
  if (['approve', 'reject', 'delete', 'suspend', 'activate', 'role_update'].includes(normalized)) {
    return normalized;
  }
  return 'edit';
};

const toAuditEntityType = (entityType) => {
  const normalized = String(entityType || '').toLowerCase();
  if (['user', 'verification', 'property', 'inquiry'].includes(normalized)) {
    return normalized;
  }
  return 'user';
};

const insertIntoNotificationsFallback = async ({ actorUserId, targetUserId, actionType, entityType, details }) => {
  const userId = actorUserId || targetUserId || null;
  if (!userId) return false;

  const message = details?.message
    || `${String(actionType || 'activity').replaceAll('_', ' ')} on ${String(entityType || 'record').replaceAll('_', ' ')}`;

  const payload = {
    user_id: userId,
    title: 'Activity recorded',
    message,
    type: 'admin_info',
    metadata: {
      source: 'activity_notification_fallback',
      actionType,
      entityType,
      actorUserId,
      targetUserId,
      details: toSafeObject(details)
    },
    created_at: new Date().toISOString()
  };

  const { error } = await supabase.from('notifications').insert(payload);
  if (!error) return true;

  if (isMissingTableError(error, 'notifications')) {
    return false;
  }

  throw error;
};

const insertIntoAuditLogsFallback = async ({ actorUserId, targetUserId, actionType, entityType, details }) => {
  const payload = {
    admin_id: actorUserId,
    target_user_id: targetUserId,
    action_type: toAuditActionType(actionType),
    entity_type: toAuditEntityType(entityType),
    details: {
      ...toSafeObject(details),
      originalActionType: actionType,
      originalEntityType: entityType,
      source: 'activity_fallback'
    },
    created_at: new Date().toISOString()
  };

  const { error } = await supabase.from('audit_logs').insert(payload);
  if (!error) return true;

  if (isMissingTableError(error, 'audit_logs')) {
    try {
      await insertAuditLogRow({
        adminId: actorUserId,
        targetUserId,
        actionType: toAuditActionType(actionType),
        entityType: toAuditEntityType(entityType),
        details: payload.details
      });
      return true;
    } catch {
      return insertIntoNotificationsFallback({
        actorUserId,
        targetUserId,
        actionType,
        entityType,
        details: payload.details
      });
    }
  }

  throw error;
};

const logActivity = async ({
  actorUserId = null,
  targetUserId = null,
  actionType,
  entityType,
  details = {}
}) => {
  const payload = {
    actor_user_id: actorUserId,
    target_user_id: targetUserId,
    action_type: actionType,
    entity_type: entityType,
    details: toSafeObject(details),
    created_at: new Date().toISOString()
  };

  const { error } = await supabase.from('activity_logs').insert(payload);
  if (!error) return true;

  if (isMissingTableError(error, 'activity_logs')) {
    try {
      await insertActivityLogRow({
        actorUserId,
        targetUserId,
        actionType,
        entityType,
        details: toSafeObject(details)
      });
      return true;
    } catch {
      const persisted = await insertIntoAuditLogsFallback({
        actorUserId,
        targetUserId,
        actionType,
        entityType,
        details
      });
      if (persisted) return true;

      return insertIntoNotificationsFallback({
        actorUserId,
        targetUserId,
        actionType,
        entityType,
        details
      });
    }
  }

  throw error;
};

module.exports = {
  logActivity,
  isMissingTableError
};
