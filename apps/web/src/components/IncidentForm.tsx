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

interface VisionResult {
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  visualCues: string[];
  confidence: number;
  safetyConcerns: string;
}

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
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [visionAnalyzing, setVisionAnalyzing] = useState(false);
  const [visionResult, setVisionResult] = useState<VisionResult | null>(null);
  const [visionError, setVisionError] = useState<string | null>(null);

  const handlePhotoSelected = async (file: File): Promise<void> => {
    setVisionError(null);
    setVisionResult(null);

    // Validate file
    if (file.size > 4_000_000) {
      setVisionError('Photo too large (max 4MB).');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Send to vision API
    setVisionAnalyzing(true);
    try {
      const base64 = await fileToBase64(file);
      const authToken = localStorage.getItem('stadiumops_auth_token') ?? '';
      const response = await fetch('/api/vision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType: file.type,
          context: `Zone: ${zoneId}, Title: ${title || '(none)'}`,
        }),
      });

      if (!response.ok) {
        const errData = (await response.json()) as { error?: { message?: string } };
        throw new Error(errData.error?.message ?? `HTTP ${String(response.status)}`);
      }

      const data = (await response.json()) as { result: VisionResult };
      setVisionResult(data.result);

      // Auto-fill form fields from vision analysis
      if (data.result.severity) {
        setSeverity(data.result.severity);
      }
      if (
        data.result.category &&
        (CATEGORIES as readonly string[]).includes(data.result.category)
      ) {
        setCategory(data.result.category as IncidentCreateInput['category']);
      }
      if (data.result.description && !description) {
        setDescription(data.result.description);
      }
    } catch (err) {
      setVisionError(err instanceof Error ? err.message : 'Vision analysis failed.');
    } finally {
      setVisionAnalyzing(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Strip "data:image/jpeg;base64," prefix
        const base64 = result.split(',')[1] ?? result;
        resolve(base64);
      };
      reader.onerror = () => {
        reject(new Error('Failed to read file.'));
      };
      reader.readAsDataURL(file);
    });

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

      {/* Photo upload with Gemini Vision auto-severity */}
      <div className="form-field">
        <label htmlFor="incident-photo" className="form-label">
          📸 Photo (AI auto-classifies severity)
        </label>
        <input
          id="incident-photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="form-input form-file-input"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              void handlePhotoSelected(file);
            }
          }}
          disabled={visionAnalyzing}
          aria-describedby="incident-photo-help"
        />
        <span id="incident-photo-help" className="form-help">
          Take a photo of the incident. Gemini Vision will analyze it and auto-fill severity +
          category.
        </span>

        {photoPreview && (
          <div className="photo-preview-container">
            <img
              src={photoPreview}
              alt="Incident preview"
              className="photo-preview"
              style={{ maxWidth: '200px', maxHeight: '200px', borderRadius: '4px' }}
            />
            {visionAnalyzing && (
              <div className="vision-analyzing" role="status" aria-live="polite">
                <span className="vision-spinner" aria-hidden="true" /> Analyzing photo...
              </div>
            )}
            {visionResult && (
              <div className="vision-result" role="status" aria-live="polite">
                <div className="vision-result-row">
                  <strong>AI Analysis:</strong> {visionResult.category} / {visionResult.severity}{' '}
                  (conf: {String(Math.round(visionResult.confidence * 100))}%)
                </div>
                <div className="vision-result-row vision-description">
                  {visionResult.description}
                </div>
                {visionResult.visualCues.length > 0 && (
                  <div className="vision-result-row vision-cues">
                    <em>Visual cues:</em> {visionResult.visualCues.join(', ')}
                  </div>
                )}
                {visionResult.safetyConcerns !== 'none' && (
                  <div className="vision-result-row vision-safety" role="alert">
                    ⚠ {visionResult.safetyConcerns}
                  </div>
                )}
              </div>
            )}
            {visionError && (
              <div className="vision-error" role="alert">
                {visionError}
              </div>
            )}
          </div>
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
