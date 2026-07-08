export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          email: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          email: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          email?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tenants: {
        Row: {
          id: string;
          name: string;
          slug: string;
          segment: string | null;
          logo_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          segment?: string | null;
          logo_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          segment?: string | null;
          logo_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tenant_members: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string;
          role: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          user_id: string;
          role?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          user_id?: string;
          role?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      clientes: {
        Row: {
          id: string;
          tenant_id: string;
          nome: string;
          email: string | null;
          telefone: string | null;
          whatsapp: string | null;
          documento: string | null;
          tipo_pessoa: string;
          data_referencia: string | null;
          cep: string | null;
          rua: string | null;
          numero: string | null;
          complemento: string | null;
          bairro: string | null;
          cidade: string | null;
          estado: string | null;
          observacoes: string | null;
          ativo: boolean;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          nome: string;
          email?: string | null;
          telefone?: string | null;
          whatsapp?: string | null;
          documento?: string | null;
          tipo_pessoa?: string;
          data_referencia?: string | null;
          cep?: string | null;
          rua?: string | null;
          numero?: string | null;
          complemento?: string | null;
          bairro?: string | null;
          cidade?: string | null;
          estado?: string | null;
          observacoes?: string | null;
          ativo?: boolean;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          nome?: string;
          email?: string | null;
          telefone?: string | null;
          whatsapp?: string | null;
          documento?: string | null;
          tipo_pessoa?: string;
          data_referencia?: string | null;
          cep?: string | null;
          rua?: string | null;
          numero?: string | null;
          complemento?: string | null;
          bairro?: string | null;
          cidade?: string | null;
          estado?: string | null;
          observacoes?: string | null;
          ativo?: boolean;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      produtos: {
        Row: {
          id: string;
          tenant_id: string;
          nome: string;
          tipo: string;
          codigo_interno: string | null;
          sku: string | null;
          codigo_barras: string | null;
          categoria: string | null;
          subcategoria: string | null;
          marca: string | null;
          unidade_medida: string;
          custo: number | null;
          preco_venda: number | null;
          margem_percent: number | null;
          estoque_atual: number;
          estoque_minimo: number | null;
          estoque_maximo: number | null;
          localizacao: string | null;
          fornecedor_principal: string | null;
          observacoes: string | null;
          ativo: boolean;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          nome: string;
          tipo?: string;
          codigo_interno?: string | null;
          sku?: string | null;
          codigo_barras?: string | null;
          categoria?: string | null;
          subcategoria?: string | null;
          marca?: string | null;
          unidade_medida?: string;
          custo?: number | null;
          preco_venda?: number | null;
          margem_percent?: number | null;
          estoque_atual?: number;
          estoque_minimo?: number | null;
          estoque_maximo?: number | null;
          localizacao?: string | null;
          fornecedor_principal?: string | null;
          observacoes?: string | null;
          ativo?: boolean;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          nome?: string;
          tipo?: string;
          codigo_interno?: string | null;
          sku?: string | null;
          codigo_barras?: string | null;
          categoria?: string | null;
          subcategoria?: string | null;
          marca?: string | null;
          unidade_medida?: string;
          custo?: number | null;
          preco_venda?: number | null;
          margem_percent?: number | null;
          estoque_atual?: number;
          estoque_minimo?: number | null;
          estoque_maximo?: number | null;
          localizacao?: string | null;
          fornecedor_principal?: string | null;
          observacoes?: string | null;
          ativo?: boolean;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      estoque_movimentacoes: {
        Row: {
          id: string;
          tenant_id: string;
          produto_id: string;
          tipo: string;
          quantidade: number;
          quantidade_anterior: number;
          quantidade_nova: number;
          motivo: string | null;
          origem: string;
          observacoes: string | null;
          created_by: string | null;
          deleted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          produto_id: string;
          tipo: string;
          quantidade: number;
          quantidade_anterior?: number;
          quantidade_nova?: number;
          motivo?: string | null;
          origem?: string;
          observacoes?: string | null;
          created_by?: string | null;
          deleted_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          produto_id?: string;
          tipo?: string;
          quantidade?: number;
          quantidade_anterior?: number;
          quantidade_nova?: number;
          motivo?: string | null;
          origem?: string;
          observacoes?: string | null;
          created_by?: string | null;
          deleted_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      vendas: {
        Row: {
          id: string;
          tenant_id: string;
          numero: number;
          cliente_id: string;
          data_venda: string;
          status: string;
          subtotal: number;
          desconto_total: number;
          total: number;
          margem_total: number | null;
          forma_pagamento: string | null;
          observacoes: string | null;
          created_by: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          numero?: number;
          cliente_id: string;
          data_venda?: string;
          status?: string;
          subtotal?: number;
          desconto_total?: number;
          total?: number;
          margem_total?: number | null;
          forma_pagamento?: string | null;
          observacoes?: string | null;
          created_by?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          numero?: number;
          cliente_id?: string;
          data_venda?: string;
          status?: string;
          subtotal?: number;
          desconto_total?: number;
          total?: number;
          margem_total?: number | null;
          forma_pagamento?: string | null;
          observacoes?: string | null;
          created_by?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      venda_itens: {
        Row: {
          id: string;
          tenant_id: string;
          venda_id: string;
          produto_id: string | null;
          descricao: string;
          tipo_item: string;
          quantidade: number;
          preco_unitario: number;
          desconto: number;
          total: number;
          custo_unitario: number | null;
          margem: number | null;
          ordem: number;
          deleted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          venda_id: string;
          produto_id?: string | null;
          descricao: string;
          tipo_item?: string;
          quantidade: number;
          preco_unitario: number;
          desconto?: number;
          total?: number;
          custo_unitario?: number | null;
          margem?: number | null;
          ordem?: number;
          deleted_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          venda_id?: string;
          produto_id?: string | null;
          descricao?: string;
          tipo_item?: string;
          quantidade?: number;
          preco_unitario?: number;
          desconto?: number;
          total?: number;
          custo_unitario?: number | null;
          margem?: number | null;
          ordem?: number;
          deleted_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
