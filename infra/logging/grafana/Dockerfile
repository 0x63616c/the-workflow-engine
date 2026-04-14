FROM grafana/grafana:11.6.0
COPY datasource.yaml /etc/grafana/provisioning/datasources/loki.yaml
COPY dashboard-provider.yaml /etc/grafana/provisioning/dashboards/default.yaml
COPY dashboards/ /etc/grafana/provisioning/dashboards/json/
