/**
 * @file apps/web/src/i18n/es.ts
 * @description ES translations.
 */

import type { Translations } from './types.js';
import en from './en.js';

const es: Translations = {
  ...en,
  'app.tagline': 'Copiloto de Voluntarios para la Copa Mundial FIFA 2026',
  'nav.dashboard': 'Panel',
  'nav.chat': 'Asistente',
  'nav.incidents': 'Incidentes',
  'nav.language': 'Idioma',
  'nav.skipToMain': 'Saltar al contenido principal',
  'dashboard.title': 'Panel de Operaciones',
  'dashboard.subtitle': 'Estado de multitud e incidentes activos',
  'dashboard.totalFans': 'Total Aficionados',
  'dashboard.activeIncidents': 'Incidentes Activos',
  'dashboard.criticalZones': 'Zonas Críticas',
  'dashboard.avgDensity': 'Densidad Promedio',
  'dashboard.crowdOverview': 'Vista General de Multitud',
  'dashboard.recentIncidents': 'Incidentes Recientes',
  'dashboard.viewAll': 'Ver todos',
  'crowd.zone': 'Zona',
  'crowd.count': 'Personas',
  'crowd.capacity': 'Capacidad',
  'crowd.level': 'Nivel',
  'crowd.level.low': 'Bajo',
  'crowd.level.moderate': 'Moderado',
  'crowd.level.high': 'Alto',
  'crowd.level.critical': 'Crítico',
  'crowd.trend': 'Tendencia',
  'crowd.updated': 'Actualizado',
  'chat.title': 'Asistente IA',
  'chat.subtitle': 'Ayuda multilingüe para voluntarios',
  'chat.placeholder': 'Pregunta sobre instalaciones, multitudes, traducciones...',
  'chat.send': 'Enviar',
  'chat.thinking': 'Pensando...',
  'chat.error': 'Error de conexión. Reintenta.',
  'chat.welcome':
    '¡Hola! Soy tu asistente de estadio. Pregúntame sobre instalaciones, multitudes o traducciones en cualquier idioma.',
  'chat.emergencyBanner': 'Emergencia detectada. Se han notificado a los respondedores.',
  'incidents.title': 'Incidentes',
  'incidents.subtitle': 'Reportar y rastrear incidentes',
  'incidents.new': 'Reportar Nuevo Incidente',
  'incidents.empty': 'No hay incidentes reportados. ¡Excelente trabajo!',
  'incidents.category': 'Categoría',
  'incidents.severity': 'Severidad',
  'incidents.status': 'Estado',
  'incidents.location': 'Ubicación',
  'incidents.description': 'Descripción',
  'incidents.title.label': 'Título',
  'incidents.submit': 'Enviar Reporte',
  'incidents.cancel': 'Cancelar',
  'incidents.success': 'Incidente reportado exitosamente.',
  'common.loading': 'Cargando...',
  'common.error': 'Algo salió mal',
  'common.retry': 'Reintentar',
  'common.refresh': 'Actualizar',
};

export default es;
