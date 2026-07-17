import { useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Spinner } from '@/components/feedback/Spinner';
import { Modal } from '@/components/common/Modal';
import { useToast } from '@/components/feedback/Toast';
import { useIntegrations, useSaveIntegration, useDisconnectIntegration, type Integration } from '@/features/integrations/api';

export function IntegrationsPage() {
  const toast = useToast();
  const { data, isLoading } = useIntegrations();
  const save = useSaveIntegration();
  const disconnect = useDisconnectIntegration();
  const [editing, setEditing] = useState<Integration | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});

  const items = data?.items ?? [];

  function openConfigure(i: Integration) {
    setEditing(i);
    const init: Record<string, string> = {};
    for (const f of i.fields) init[f.key] = String(i.config[f.key] ?? '');
    setValues(init);
  }

  async function onSave() {
    if (!editing) return;
    try {
      await save.mutateAsync({ key: editing.key, config: values, isConnected: true });
      toast.success(`${editing.name} connected.`);
      setEditing(null);
    } catch { toast.error('Could not save.'); }
  }

  return (
    <div>
      <PageHeader title="Integrations" description="Connect analytics, marketing, and communication tools." />
      {isLoading ? <Spinner center /> : (
        <div className="row g-3">
          {items.map((i) => (
            <div className="col-12 col-md-6 col-lg-4" key={i.key}>
              <div className="at-card p-3 h-100 d-flex flex-column">
                <div className="d-flex align-items-start gap-2 mb-2">
                  <span className="d-inline-flex align-items-center justify-content-center" style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--at-primary-soft)', color: 'var(--at-primary)' }}><i className={`bi ${i.icon} fs-5`} /></span>
                  <div>
                    <div className="fw-semibold">{i.name}</div>
                    {i.isConnected ? <span className="at-badge" style={{ background: 'var(--at-success-soft)', color: '#15803d' }}>Connected</span> : <span className="at-badge" style={{ background: 'var(--at-surface-muted)', color: 'var(--at-muted)' }}>Not connected</span>}
                  </div>
                </div>
                <p className="text-body-secondary small flex-grow-1">{i.description}</p>
                {i.lastError && <div className="alert alert-warning py-1 px-2 small mb-2">{i.lastError}</div>}
                <div className="d-flex gap-2">
                  <button className="btn btn-sm btn-outline-primary flex-grow-1" onClick={() => openConfigure(i)}>{i.isConnected ? 'Configure' : 'Connect'}</button>
                  {i.isConnected && <button className="btn btn-sm btn-outline-secondary" onClick={async () => { await disconnect.mutateAsync(i.key); toast.success('Disconnected.'); }}>Disconnect</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={editing != null} onClose={() => setEditing(null)} title={editing ? `Configure ${editing.name}` : ''} footer={<><button className="btn btn-light" onClick={() => setEditing(null)}>Cancel</button><button className="btn btn-primary" onClick={onSave} disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save & connect'}</button></>}>
        {editing && (
          <div className="vstack gap-3">
            {editing.fields.map((f) => (
              <div key={f.key}>
                <label className="form-label">{f.label} {f.secret && <span className="text-body-secondary small">(stored securely)</span>}</label>
                <input className="form-control" type={f.secret ? 'password' : 'text'} placeholder={f.placeholder} value={values[f.key] ?? ''} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} />
              </div>
            ))}
            <p className="text-body-secondary small mb-0">Secrets are stored server-side and never exposed in the storefront bundle.</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
