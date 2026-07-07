export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agencias_reguladoras: {
        Row: {
          ativa: boolean
          cnpj: string | null
          created_at: string
          email_contato: string | null
          endereco: string | null
          esfera: string
          id: string
          municipio: string | null
          nome: string
          observacoes: string | null
          sigla: string | null
          site: string | null
          telefone: string | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          ativa?: boolean
          cnpj?: string | null
          created_at?: string
          email_contato?: string | null
          endereco?: string | null
          esfera: string
          id?: string
          municipio?: string | null
          nome: string
          observacoes?: string | null
          sigla?: string | null
          site?: string | null
          telefone?: string | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          ativa?: boolean
          cnpj?: string | null
          created_at?: string
          email_contato?: string | null
          endereco?: string | null
          esfera?: string
          id?: string
          municipio?: string | null
          nome?: string
          observacoes?: string | null
          sigla?: string | null
          site?: string | null
          telefone?: string | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      api_probe_log: {
        Row: {
          checked_at: string
          duration_ms: number | null
          endpoint: string
          error_message: string | null
          http_status: number | null
          id: string
          source: string
          state: string
        }
        Insert: {
          checked_at?: string
          duration_ms?: number | null
          endpoint: string
          error_message?: string | null
          http_status?: number | null
          id?: string
          source: string
          state: string
        }
        Update: {
          checked_at?: string
          duration_ms?: number | null
          endpoint?: string
          error_message?: string | null
          http_status?: number | null
          id?: string
          source?: string
          state?: string
        }
        Relationships: []
      }
      atlas_indicadores: {
        Row: {
          ano_referencia: number | null
          bacia: string | null
          carga_dbo_kg_dia: number | null
          cobertura_coleta_pct: number | null
          cobertura_tratamento_pct: number | null
          created_at: string
          fonte: string
          ibge_code: string | null
          id: string
          municipio: string | null
          populacao_urbana: number | null
          raw: Json | null
          rios_comprometidos_km: number | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          ano_referencia?: number | null
          bacia?: string | null
          carga_dbo_kg_dia?: number | null
          cobertura_coleta_pct?: number | null
          cobertura_tratamento_pct?: number | null
          created_at?: string
          fonte?: string
          ibge_code?: string | null
          id?: string
          municipio?: string | null
          populacao_urbana?: number | null
          raw?: Json | null
          rios_comprometidos_km?: number | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          ano_referencia?: number | null
          bacia?: string | null
          carga_dbo_kg_dia?: number | null
          cobertura_coleta_pct?: number | null
          cobertura_tratamento_pct?: number | null
          created_at?: string
          fonte?: string
          ibge_code?: string | null
          id?: string
          municipio?: string | null
          populacao_urbana?: number | null
          raw?: Json | null
          rios_comprometidos_km?: number | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          id: string
          metadata: Json | null
          severity: string
          target: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          metadata?: Json | null
          severity?: string
          target?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          severity?: string
          target?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      concessionarias: {
        Row: {
          abrangencia: string | null
          agencia_reguladora_id: string | null
          ativa: boolean
          cnpj: string | null
          created_at: string
          email_contato: string | null
          endereco: string | null
          id: string
          municipios_atendidos: number | null
          natureza: string | null
          nome: string
          observacoes: string | null
          populacao_atendida: number | null
          sigla: string | null
          site: string | null
          telefone: string | null
          tipo: string
          uf: string
          updated_at: string
        }
        Insert: {
          abrangencia?: string | null
          agencia_reguladora_id?: string | null
          ativa?: boolean
          cnpj?: string | null
          created_at?: string
          email_contato?: string | null
          endereco?: string | null
          id?: string
          municipios_atendidos?: number | null
          natureza?: string | null
          nome: string
          observacoes?: string | null
          populacao_atendida?: number | null
          sigla?: string | null
          site?: string | null
          telefone?: string | null
          tipo: string
          uf: string
          updated_at?: string
        }
        Update: {
          abrangencia?: string | null
          agencia_reguladora_id?: string | null
          ativa?: boolean
          cnpj?: string | null
          created_at?: string
          email_contato?: string | null
          endereco?: string | null
          id?: string
          municipios_atendidos?: number | null
          natureza?: string | null
          nome?: string
          observacoes?: string | null
          populacao_atendida?: number | null
          sigla?: string | null
          site?: string | null
          telefone?: string | null
          tipo?: string
          uf?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "concessionarias_agencia_reguladora_id_fkey"
            columns: ["agencia_reguladora_id"]
            isOneToOne: false
            referencedRelation: "agencias_reguladoras"
            referencedColumns: ["id"]
          },
        ]
      }
      cortex_modelos: {
        Row: {
          causal_report_url: string | null
          created_at: string
          created_by: string | null
          descricao: string | null
          falso_afluente_checklist: Json
          id: string
          metricas: Json
          nome: string
          provider_model: string
          status: string
          tipo: string
          updated_at: string
          versao: string
        }
        Insert: {
          causal_report_url?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          falso_afluente_checklist?: Json
          id?: string
          metricas?: Json
          nome: string
          provider_model?: string
          status?: string
          tipo: string
          updated_at?: string
          versao: string
        }
        Update: {
          causal_report_url?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          falso_afluente_checklist?: Json
          id?: string
          metricas?: Json
          nome?: string
          provider_model?: string
          status?: string
          tipo?: string
          updated_at?: string
          versao?: string
        }
        Relationships: []
      }
      cortex_predicoes: {
        Row: {
          agencia_reguladora_id: string | null
          bacia: string | null
          classificacao: string | null
          concessionaria_id: string | null
          confianca: number | null
          criado_em: string
          escopo: string
          ete_id: string | null
          explicacao: string | null
          features: Json | null
          features_hash: string | null
          horizonte_dias: number | null
          id: string
          metrica: string
          modelo_id: string
          valor: number | null
        }
        Insert: {
          agencia_reguladora_id?: string | null
          bacia?: string | null
          classificacao?: string | null
          concessionaria_id?: string | null
          confianca?: number | null
          criado_em?: string
          escopo: string
          ete_id?: string | null
          explicacao?: string | null
          features?: Json | null
          features_hash?: string | null
          horizonte_dias?: number | null
          id?: string
          metrica: string
          modelo_id: string
          valor?: number | null
        }
        Update: {
          agencia_reguladora_id?: string | null
          bacia?: string | null
          classificacao?: string | null
          concessionaria_id?: string | null
          confianca?: number | null
          criado_em?: string
          escopo?: string
          ete_id?: string | null
          explicacao?: string | null
          features?: Json | null
          features_hash?: string | null
          horizonte_dias?: number | null
          id?: string
          metrica?: string
          modelo_id?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cortex_predicoes_agencia_reguladora_id_fkey"
            columns: ["agencia_reguladora_id"]
            isOneToOne: false
            referencedRelation: "agencias_reguladoras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cortex_predicoes_concessionaria_id_fkey"
            columns: ["concessionaria_id"]
            isOneToOne: false
            referencedRelation: "concessionarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cortex_predicoes_ete_id_fkey"
            columns: ["ete_id"]
            isOneToOne: false
            referencedRelation: "etes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cortex_predicoes_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "cortex_modelos"
            referencedColumns: ["id"]
          },
        ]
      }
      cortex_thresholds: {
        Row: {
          alto_min: number
          bacia: string | null
          created_at: string
          critico_min: number
          id: string
          modelo_id: string | null
          updated_at: string
        }
        Insert: {
          alto_min?: number
          bacia?: string | null
          created_at?: string
          critico_min?: number
          id?: string
          modelo_id?: string | null
          updated_at?: string
        }
        Update: {
          alto_min?: number
          bacia?: string | null
          created_at?: string
          critico_min?: number
          id?: string
          modelo_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cortex_thresholds_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "cortex_modelos"
            referencedColumns: ["id"]
          },
        ]
      }
      cron_config: {
        Row: {
          cortex_infer_url: string | null
          cortex_ingest_url: string | null
          id: string
          ldap_sync_anon_key: string
          ldap_sync_url: string
          updated_at: string
        }
        Insert: {
          cortex_infer_url?: string | null
          cortex_ingest_url?: string | null
          id?: string
          ldap_sync_anon_key: string
          ldap_sync_url: string
          updated_at?: string
        }
        Update: {
          cortex_infer_url?: string | null
          cortex_ingest_url?: string | null
          id?: string
          ldap_sync_anon_key?: string
          ldap_sync_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      dbo_medicoes: {
        Row: {
          conforme: boolean | null
          created_at: string
          dbo_entrada_mg_l: number
          dbo_saida_mg_l: number
          eficiencia_pct: number | null
          ete_id: string
          id: string
          medido_em: string
        }
        Insert: {
          conforme?: boolean | null
          created_at?: string
          dbo_entrada_mg_l: number
          dbo_saida_mg_l: number
          eficiencia_pct?: number | null
          ete_id: string
          id?: string
          medido_em?: string
        }
        Update: {
          conforme?: boolean | null
          created_at?: string
          dbo_entrada_mg_l?: number
          dbo_saida_mg_l?: number
          eficiencia_pct?: number | null
          ete_id?: string
          id?: string
          medido_em?: string
        }
        Relationships: [
          {
            foreignKeyName: "dbo_medicoes_ete_id_fkey"
            columns: ["ete_id"]
            isOneToOne: false
            referencedRelation: "etes"
            referencedColumns: ["id"]
          },
        ]
      }
      etes: {
        Row: {
          codigo: string | null
          concessionaria_id: string | null
          created_at: string
          data_inicio_operacao: string | null
          id: string
          latitude: number | null
          longitude: number | null
          municipio: string
          nome: string
          observacoes: string | null
          populacao_atendida: number | null
          status: string
          tipo_tratamento: string | null
          uf: string
          updated_at: string
          vazao_atual_lps: number | null
          vazao_projeto_lps: number | null
        }
        Insert: {
          codigo?: string | null
          concessionaria_id?: string | null
          created_at?: string
          data_inicio_operacao?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          municipio: string
          nome: string
          observacoes?: string | null
          populacao_atendida?: number | null
          status?: string
          tipo_tratamento?: string | null
          uf: string
          updated_at?: string
          vazao_atual_lps?: number | null
          vazao_projeto_lps?: number | null
        }
        Update: {
          codigo?: string | null
          concessionaria_id?: string | null
          created_at?: string
          data_inicio_operacao?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          municipio?: string
          nome?: string
          observacoes?: string | null
          populacao_atendida?: number | null
          status?: string
          tipo_tratamento?: string | null
          uf?: string
          updated_at?: string
          vazao_atual_lps?: number | null
          vazao_projeto_lps?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "etes_concessionaria_id_fkey"
            columns: ["concessionaria_id"]
            isOneToOne: false
            referencedRelation: "concessionarias"
            referencedColumns: ["id"]
          },
        ]
      }
      ldap_config: {
        Row: {
          attr_email: string
          attr_name: string
          attr_org: string
          base_dn: string
          bind_dn: string
          bind_password: string
          created_at: string
          default_role: Database["public"]["Enums"]["app_role"]
          enabled: boolean
          host: string
          id: string
          port: number
          updated_at: string
          use_tls: boolean
          user_filter: string
        }
        Insert: {
          attr_email?: string
          attr_name?: string
          attr_org?: string
          base_dn?: string
          bind_dn?: string
          bind_password?: string
          created_at?: string
          default_role?: Database["public"]["Enums"]["app_role"]
          enabled?: boolean
          host?: string
          id?: string
          port?: number
          updated_at?: string
          use_tls?: boolean
          user_filter?: string
        }
        Update: {
          attr_email?: string
          attr_name?: string
          attr_org?: string
          base_dn?: string
          bind_dn?: string
          bind_password?: string
          created_at?: string
          default_role?: Database["public"]["Enums"]["app_role"]
          enabled?: boolean
          host?: string
          id?: string
          port?: number
          updated_at?: string
          use_tls?: boolean
          user_filter?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          agencia_reguladora_id: string | null
          avatar_url: string | null
          concessionaria_id: string | null
          created_at: string
          full_name: string | null
          id: string
          organization: string | null
          position: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agencia_reguladora_id?: string | null
          avatar_url?: string | null
          concessionaria_id?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          organization?: string | null
          position?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agencia_reguladora_id?: string | null
          avatar_url?: string | null
          concessionaria_id?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          organization?: string | null
          position?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_agencia_reguladora_id_fkey"
            columns: ["agencia_reguladora_id"]
            isOneToOne: false
            referencedRelation: "agencias_reguladoras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_concessionaria_id_fkey"
            columns: ["concessionaria_id"]
            isOneToOne: false
            referencedRelation: "concessionarias"
            referencedColumns: ["id"]
          },
        ]
      }
      sei_config: {
        Row: {
          api_key: string
          api_url: string
          created_at: string
          enabled: boolean
          id: string
          orgao_id: string
          tipo_processo: string
          unidade_id: string
          updated_at: string
        }
        Insert: {
          api_key?: string
          api_url?: string
          created_at?: string
          enabled?: boolean
          id?: string
          orgao_id?: string
          tipo_processo?: string
          unidade_id?: string
          updated_at?: string
        }
        Update: {
          api_key?: string
          api_url?: string
          created_at?: string
          enabled?: boolean
          id?: string
          orgao_id?: string
          tipo_processo?: string
          unidade_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      smtp_config: {
        Row: {
          created_at: string
          enabled: boolean
          from_email: string
          from_name: string
          host: string
          id: string
          password: string
          port: number
          updated_at: string
          use_tls: boolean
          username: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          from_email?: string
          from_name?: string
          host?: string
          id?: string
          password?: string
          port?: number
          updated_at?: string
          use_tls?: boolean
          username?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          from_email?: string
          from_name?: string
          host?: string
          id?: string
          password?: string
          port?: number
          updated_at?: string
          use_tls?: boolean
          username?: string
        }
        Relationships: []
      }
      system_parameters: {
        Row: {
          api_timeout_seconds: number
          created_at: string
          dbo_critico: number
          dbo_min: number
          id: string
          max_upload_mb: number
          retention_days: number
          sync_interval_minutes: number
          updated_at: string
        }
        Insert: {
          api_timeout_seconds?: number
          created_at?: string
          dbo_critico?: number
          dbo_min?: number
          id?: string
          max_upload_mb?: number
          retention_days?: number
          sync_interval_minutes?: number
          updated_at?: string
        }
        Update: {
          api_timeout_seconds?: number
          created_at?: string
          dbo_critico?: number
          dbo_min?: number
          id?: string
          max_upload_mb?: number
          retention_days?: number
          sync_interval_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_agencia: { Args: never; Returns: string }
      current_user_concessionaria: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      schedule_cortex_infer: {
        Args: { _anon_key: string; _function_url: string }
        Returns: undefined
      }
      schedule_ldap_sync: {
        Args: { _anon_key: string; _function_url: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "operador" | "gestor_ana" | "superadmin" | "gestor_ar"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["operador", "gestor_ana", "superadmin", "gestor_ar"],
    },
  },
} as const
