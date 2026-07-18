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
        Relationships: [
          {
            foreignKeyName: "estoque_movimentacoes_produto_id_fkey";
            columns: ["produto_id"];
            isOneToOne: false;
            referencedRelation: "produtos";
            referencedColumns: ["id"];
          },
        ];
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
          forma_pagamento_id: string | null;
          quantidade_parcelas: number;
          categoria_financeira_id: string | null;
          centro_custo_id: string | null;
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
          forma_pagamento_id?: string | null;
          quantidade_parcelas?: number;
          categoria_financeira_id?: string | null;
          centro_custo_id?: string | null;
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
          forma_pagamento_id?: string | null;
          quantidade_parcelas?: number;
          categoria_financeira_id?: string | null;
          centro_custo_id?: string | null;
          observacoes?: string | null;
          created_by?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vendas_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vendas_forma_pagamento_id_fkey";
            columns: ["forma_pagamento_id"];
            isOneToOne: false;
            referencedRelation: "formas_pagamento";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vendas_categoria_financeira_id_fkey";
            columns: ["categoria_financeira_id"];
            isOneToOne: false;
            referencedRelation: "categorias_financeiras";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vendas_centro_custo_id_fkey";
            columns: ["centro_custo_id"];
            isOneToOne: false;
            referencedRelation: "centros_custo";
            referencedColumns: ["id"];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: "venda_itens_produto_id_fkey";
            columns: ["produto_id"];
            isOneToOne: false;
            referencedRelation: "produtos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "venda_itens_venda_id_fkey";
            columns: ["venda_id"];
            isOneToOne: false;
            referencedRelation: "vendas";
            referencedColumns: ["id"];
          },
        ];
      };
      plano_contas: {
        Row: {
          id: string;
          tenant_id: string;
          codigo: string;
          nome: string;
          tipo: string;
          natureza: string;
          conta_pai_id: string | null;
          aceita_lancamento: boolean;
          ordem: number;
          observacoes: string | null;
          ativo: boolean;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          codigo: string;
          nome: string;
          tipo: string;
          natureza?: string;
          conta_pai_id?: string | null;
          aceita_lancamento?: boolean;
          ordem?: number;
          observacoes?: string | null;
          ativo?: boolean;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          codigo?: string;
          nome?: string;
          tipo?: string;
          natureza?: string;
          conta_pai_id?: string | null;
          aceita_lancamento?: boolean;
          ordem?: number;
          observacoes?: string | null;
          ativo?: boolean;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      centros_custo: {
        Row: {
          id: string;
          tenant_id: string;
          codigo: string;
          nome: string;
          descricao: string | null;
          responsavel: string | null;
          observacoes: string | null;
          ativo: boolean;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          codigo: string;
          nome: string;
          descricao?: string | null;
          responsavel?: string | null;
          observacoes?: string | null;
          ativo?: boolean;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          codigo?: string;
          nome?: string;
          descricao?: string | null;
          responsavel?: string | null;
          observacoes?: string | null;
          ativo?: boolean;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      contas_bancarias: {
        Row: {
          id: string;
          tenant_id: string;
          nome: string;
          tipo: string;
          banco: string | null;
          agencia: string | null;
          conta: string | null;
          titular: string | null;
          saldo_inicial: number;
          saldo_atual: number;
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
          banco?: string | null;
          agencia?: string | null;
          conta?: string | null;
          titular?: string | null;
          saldo_inicial?: number;
          saldo_atual?: number;
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
          banco?: string | null;
          agencia?: string | null;
          conta?: string | null;
          titular?: string | null;
          saldo_inicial?: number;
          saldo_atual?: number;
          observacoes?: string | null;
          ativo?: boolean;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      formas_pagamento: {
        Row: {
          id: string;
          tenant_id: string;
          nome: string;
          tipo: string;
          gera_financeiro: boolean;
          dias_compensacao: number;
          taxa_percent: number | null;
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
          gera_financeiro?: boolean;
          dias_compensacao?: number;
          taxa_percent?: number | null;
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
          gera_financeiro?: boolean;
          dias_compensacao?: number;
          taxa_percent?: number | null;
          observacoes?: string | null;
          ativo?: boolean;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      categorias_financeiras: {
        Row: {
          id: string;
          tenant_id: string;
          nome: string;
          tipo: string;
          plano_conta_id: string | null;
          cor: string | null;
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
          tipo: string;
          plano_conta_id?: string | null;
          cor?: string | null;
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
          plano_conta_id?: string | null;
          cor?: string | null;
          observacoes?: string | null;
          ativo?: boolean;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      contas_receber: {
        Row: {
          id: string;
          tenant_id: string;
          numero: number;
          cliente_id: string;
          venda_id: string | null;
          forma_pagamento_id: string | null;
          categoria_financeira_id: string | null;
          centro_custo_id: string | null;
          plano_conta_id: string | null;
          conta_bancaria_id: string | null;
          descricao: string;
          grupo_parcelamento_id: string | null;
          parcela_numero: number;
          parcela_total: number;
          status: string;
          valor_original: number;
          desconto: number;
          juros: number;
          multa: number;
          valor_recebido: number;
          data_emissao: string;
          data_competencia: string;
          data_vencimento: string;
          data_recebimento: string | null;
          observacoes: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          numero?: number;
          cliente_id: string;
          venda_id?: string | null;
          forma_pagamento_id?: string | null;
          categoria_financeira_id?: string | null;
          centro_custo_id?: string | null;
          plano_conta_id?: string | null;
          conta_bancaria_id?: string | null;
          descricao: string;
          grupo_parcelamento_id?: string | null;
          parcela_numero?: number;
          parcela_total?: number;
          status?: string;
          valor_original: number;
          desconto?: number;
          juros?: number;
          multa?: number;
          valor_recebido?: number;
          data_emissao?: string;
          data_competencia?: string;
          data_vencimento: string;
          data_recebimento?: string | null;
          observacoes?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          numero?: number;
          cliente_id?: string;
          venda_id?: string | null;
          forma_pagamento_id?: string | null;
          categoria_financeira_id?: string | null;
          centro_custo_id?: string | null;
          plano_conta_id?: string | null;
          conta_bancaria_id?: string | null;
          descricao?: string;
          grupo_parcelamento_id?: string | null;
          parcela_numero?: number;
          parcela_total?: number;
          status?: string;
          valor_original?: number;
          desconto?: number;
          juros?: number;
          multa?: number;
          valor_recebido?: number;
          data_emissao?: string;
          data_competencia?: string;
          data_vencimento?: string;
          data_recebimento?: string | null;
          observacoes?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "contas_receber_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contas_receber_venda_id_fkey";
            columns: ["venda_id"];
            isOneToOne: false;
            referencedRelation: "vendas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contas_receber_forma_pagamento_id_fkey";
            columns: ["forma_pagamento_id"];
            isOneToOne: false;
            referencedRelation: "formas_pagamento";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contas_receber_categoria_financeira_id_fkey";
            columns: ["categoria_financeira_id"];
            isOneToOne: false;
            referencedRelation: "categorias_financeiras";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contas_receber_centro_custo_id_fkey";
            columns: ["centro_custo_id"];
            isOneToOne: false;
            referencedRelation: "centros_custo";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contas_receber_plano_conta_id_fkey";
            columns: ["plano_conta_id"];
            isOneToOne: false;
            referencedRelation: "plano_contas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contas_receber_conta_bancaria_id_fkey";
            columns: ["conta_bancaria_id"];
            isOneToOne: false;
            referencedRelation: "contas_bancarias";
            referencedColumns: ["id"];
          },
        ];
      };
      fornecedores: {
        Row: {
          id: string;
          tenant_id: string;
          nome: string;
          documento: string | null;
          email: string | null;
          telefone: string | null;
          ativo: boolean;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          nome: string;
          documento?: string | null;
          email?: string | null;
          telefone?: string | null;
          ativo?: boolean;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          nome?: string;
          documento?: string | null;
          email?: string | null;
          telefone?: string | null;
          ativo?: boolean;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      contas_pagar: {
        Row: {
          id: string;
          tenant_id: string;
          numero: number;
          fornecedor_id: string | null;
          fornecedor_nome: string | null;
          forma_pagamento_id: string | null;
          categoria_financeira_id: string | null;
          centro_custo_id: string | null;
          plano_conta_id: string | null;
          conta_bancaria_id: string | null;
          descricao: string;
          grupo_parcelamento_id: string | null;
          parcela_numero: number;
          parcela_total: number;
          status: string;
          valor_original: number;
          desconto: number;
          juros: number;
          multa: number;
          valor_pago: number;
          data_emissao: string;
          data_competencia: string;
          data_vencimento: string;
          data_pagamento: string | null;
          observacoes: string | null;
          anexos_metadata: unknown;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          numero?: number;
          fornecedor_id?: string | null;
          fornecedor_nome?: string | null;
          forma_pagamento_id?: string | null;
          categoria_financeira_id?: string | null;
          centro_custo_id?: string | null;
          plano_conta_id?: string | null;
          conta_bancaria_id?: string | null;
          descricao: string;
          grupo_parcelamento_id?: string | null;
          parcela_numero?: number;
          parcela_total?: number;
          status?: string;
          valor_original: number;
          desconto?: number;
          juros?: number;
          multa?: number;
          valor_pago?: number;
          data_emissao?: string;
          data_competencia?: string;
          data_vencimento: string;
          data_pagamento?: string | null;
          observacoes?: string | null;
          anexos_metadata?: unknown;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          numero?: number;
          fornecedor_id?: string | null;
          fornecedor_nome?: string | null;
          forma_pagamento_id?: string | null;
          categoria_financeira_id?: string | null;
          centro_custo_id?: string | null;
          plano_conta_id?: string | null;
          conta_bancaria_id?: string | null;
          descricao?: string;
          grupo_parcelamento_id?: string | null;
          parcela_numero?: number;
          parcela_total?: number;
          status?: string;
          valor_original?: number;
          desconto?: number;
          juros?: number;
          multa?: number;
          valor_pago?: number;
          data_emissao?: string;
          data_competencia?: string;
          data_vencimento?: string;
          data_pagamento?: string | null;
          observacoes?: string | null;
          anexos_metadata?: unknown;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "contas_pagar_fornecedor_id_fkey";
            columns: ["fornecedor_id"];
            isOneToOne: false;
            referencedRelation: "fornecedores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contas_pagar_forma_pagamento_id_fkey";
            columns: ["forma_pagamento_id"];
            isOneToOne: false;
            referencedRelation: "formas_pagamento";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contas_pagar_categoria_financeira_id_fkey";
            columns: ["categoria_financeira_id"];
            isOneToOne: false;
            referencedRelation: "categorias_financeiras";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contas_pagar_centro_custo_id_fkey";
            columns: ["centro_custo_id"];
            isOneToOne: false;
            referencedRelation: "centros_custo";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contas_pagar_plano_conta_id_fkey";
            columns: ["plano_conta_id"];
            isOneToOne: false;
            referencedRelation: "plano_contas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contas_pagar_conta_bancaria_id_fkey";
            columns: ["conta_bancaria_id"];
            isOneToOne: false;
            referencedRelation: "contas_bancarias";
            referencedColumns: ["id"];
          },
        ];
      };
      movimentacoes_bancarias: {
        Row: {
          id: string;
          tenant_id: string;
          conta_bancaria_id: string;
          conta_bancaria_contrapartida_id: string | null;
          grupo_transferencia_id: string | null;
          tipo: string;
          transferencia_papel: string | null;
          valor: number;
          saldo_anterior: number;
          saldo_novo: number;
          data_movimentacao: string;
          descricao: string;
          origem: string;
          conta_pagar_id: string | null;
          conta_receber_id: string | null;
          movimentacao_estornada_id: string | null;
          estornada_por_id: string | null;
          observacoes: string | null;
          created_by: string | null;
          deleted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          conta_bancaria_id: string;
          conta_bancaria_contrapartida_id?: string | null;
          grupo_transferencia_id?: string | null;
          tipo: string;
          transferencia_papel?: string | null;
          valor: number;
          saldo_anterior: number;
          saldo_novo: number;
          data_movimentacao?: string;
          descricao: string;
          origem?: string;
          conta_pagar_id?: string | null;
          conta_receber_id?: string | null;
          movimentacao_estornada_id?: string | null;
          estornada_por_id?: string | null;
          observacoes?: string | null;
          created_by?: string | null;
          deleted_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          conta_bancaria_id?: string;
          conta_bancaria_contrapartida_id?: string | null;
          grupo_transferencia_id?: string | null;
          tipo?: string;
          transferencia_papel?: string | null;
          valor?: number;
          saldo_anterior?: number;
          saldo_novo?: number;
          data_movimentacao?: string;
          descricao?: string;
          origem?: string;
          conta_pagar_id?: string | null;
          conta_receber_id?: string | null;
          movimentacao_estornada_id?: string | null;
          estornada_por_id?: string | null;
          observacoes?: string | null;
          created_by?: string | null;
          deleted_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "movimentacoes_bancarias_conta_bancaria_id_fkey";
            columns: ["conta_bancaria_id"];
            isOneToOne: false;
            referencedRelation: "contas_bancarias";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "movimentacoes_bancarias_conta_bancaria_contrapartida_id_fkey";
            columns: ["conta_bancaria_contrapartida_id"];
            isOneToOne: false;
            referencedRelation: "contas_bancarias";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "movimentacoes_bancarias_conta_pagar_id_fkey";
            columns: ["conta_pagar_id"];
            isOneToOne: false;
            referencedRelation: "contas_pagar";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "movimentacoes_bancarias_conta_receber_id_fkey";
            columns: ["conta_receber_id"];
            isOneToOne: false;
            referencedRelation: "contas_receber";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      assert_tenant_member: {
        Args: { p_tenant_id: string };
        Returns: undefined;
      };
      faturar_venda_atomico: {
        Args: {
          p_tenant_id: string;
          p_venda_id: string;
          p_created_by?: string | null;
        };
        Returns: string;
      };
      cancelar_venda_atomico: {
        Args: {
          p_tenant_id: string;
          p_venda_id: string;
          p_created_by?: string | null;
        };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
  };
};
