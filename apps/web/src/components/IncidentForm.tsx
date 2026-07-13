/**
 * @file apps/web/src/components/IncidentForm.tsx
 * @description Accessible incident report form with Zod validation.
 *   All fields have labels, error messages are announced via aria-live.
 */

import { type FC, useState, type FormEvent } from 'react';
import { IncidentCreateSchema, type IncidentCreateInput } from '@stadiumops/shared';
import { useI18n } from '../context/I18nContext.js';
import { getCurrentStadium } from '../services/crowdService.js';

interface IncidentFormProps {
  onSubmit: (input: IncidentCreateInput) => Promise<void>;
  onCancel: () => void;
}

type FormErrors = Partial<Record<keyof IncidentCreateInput, string>>;

const CATEGORIES = [
  'medical',
  'security',
  'fire',
  'crowd_flow',
  'lost_child',
  'facilities',
  'other',
] as const;

const SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;

export const IncidentForm: FC<IncidentFormProps> = ({ onSubmit, onCancel }) => {
  const { t } = useI18n();
  const stadium = getCurrentStadium();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<IncidentCreateInput['category']>('medical');
  const [severity, setSeverity] = useState<IncidentCreateInput['severity']>('medium');
  const [zoneId, setZoneId] = useState(stadium.zones[0]?.id ?? '');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    const input: IncidentCreateInput = {
      stadiumId: stadium.id,
      zoneId,
      category,
      title,
      description,
      severity,
    };

    const result = IncidentCreateSchema.safeParse(input);
    if (result.success) {
      setErrors({});
      return true;
    }

    const newErrors: FormErrors = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0] as keyof IncidentCreateInput;
      newErrors[field] ??= issue.message;
    }
    setErrors(newErrors);
    return false;
  };

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        stadiumId: stadium.id,
        zoneId,
        category,
        title,
        description,
        severity,
      });
      // Reset form on success
      setTitle('');
      setDescription('');
      setCategory('medical');
      setSeverity('medium');
      setZoneId(stadium.zones[0]?.id ?? '');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="incident-form" onSubmit={handleSubmit} noValidate>
      <div className="form-field">
        <label htmlFor="incident-title" className="form-label">
          {t('incidents.title.label')}
        </label>
        <input
          id="incident-title"
          type="text"
          className="form-input"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
          }}
          maxLength={140}
          required
          aria-invalid={Boolean(errors.title)}
          aria-describedby={errors.title ? 'incident-title-error' : undefined}
        />
        {errors.title && (
          <span id="incident-title-error" className="form-error" role="alert">
            {errors.title}
          </span>
        )}
      </div>

      <div className="form-field">
        <label htmlFor="incident-description" className="form-label">
          {t('incidents.description')}
        </label>
        <textarea
          id="incident-description"
          className="form-input form-textarea"
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
          }}
          maxLength={1000}
          rows={4}
          required
          aria-invalid={Boolean(errors.description)}
          aria-describedby={errors.description ? 'incident-description-error' : undefined}
        />
        {errors.description && (
          <span id="incident-description-error" className="form-error" role="alert">
            {errors.description}
          </span>
        )}
      </div>

      <div className="form-row">
        <div className="form-field">
          <label htmlFor="incident-category" className="form-label">
            {t('incidents.category')}
          </label>
          <select
            id="incident-category"
            className="form-input form-select"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as IncidentCreateInput['category']);
            }}
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {t(`incidents.category.${cat}`)}
              </option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="incident-severity" className="form-label">
            {t('incidents.severity')}
          </label>
          <select
            id="incident-severity"
            className="form-input form-select"
            value={severity}
            onChange={(e) => {
              setSeverity(e.target.value as IncidentCreateInput['severity']);
            }}
          >
            {SEVERITIES.map((sev) => (
              <option key={sev} value={sev}>
                {t(`incidents.severity.${sev}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-field">
        <label htmlFor="incident-zone" className="form-label">
          {t('incidents.location')}
        </label>
        <select
          id="incident-zone"
          className="form-input form-select"
          value={zoneId}
          onChange={(e) => {
            setZoneId(e.target.value);
          }}
        >
          {stadium.zones.map((zone) => (
            <option key={zone.id} value={zone.id}>
              {zone.name}
            </option>
          ))}
        </select>
      </div>

      <div className="form-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          {t('incidents.cancel')}
        </button>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? t('common.loading') : t('incidents.submit')}
        </button>
      </div>
    </form>
  );
};
