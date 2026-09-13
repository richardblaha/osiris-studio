{{/* Chart name, truncated to fit Kubernetes name limits. */}}
{{- define "osiris-web.name" -}}
{{- .Chart.Name | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/* Fully qualified app name (release name + chart name, deduped if they match). */}}
{{- define "osiris-web.fullname" -}}
{{- if contains .Chart.Name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name .Chart.Name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}

{{- define "osiris-web.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "osiris-web.labels" -}}
helm.sh/chart: {{ include "osiris-web.chart" . }}
{{ include "osiris-web.selectorLabels" . }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{- define "osiris-web.selectorLabels" -}}
app.kubernetes.io/name: {{ include "osiris-web.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{- define "osiris-web.serviceAccountName" -}}
{{- if .Values.serviceAccount.create -}}
{{- default (include "osiris-web.fullname" .) .Values.serviceAccount.name -}}
{{- else -}}
{{- default "default" .Values.serviceAccount.name -}}
{{- end -}}
{{- end -}}

{{/* Image ref: image.tag if set, else Chart.AppVersion (the release tag). */}}
{{- define "osiris-web.image" -}}
{{- $tag := .Values.image.tag | default .Chart.AppVersion -}}
{{- printf "%s:%s" .Values.image.repository $tag -}}
{{- end -}}
