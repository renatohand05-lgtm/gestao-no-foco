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
          razao_social: string | null;
          segmento: string | null;
          porte: string | null;
          origem: string | null;
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
          razao_social?: string | null;
          segmento?: string | null;
          porte?: string | null;
          origem?: string | null;
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
          razao_social?: string | null;
          segmento?: string | null;
          porte?: string | null;
          origem?: string | null;
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
          dre_linha: string | null;
          dre_detalhe: string | null;
          dre_classificacao_origem: string | null;
          dre_classificacao_em: string | null;
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
          dre_linha?: string | null;
          dre_detalhe?: string | null;
          dre_classificacao_origem?: string | null;
          dre_classificacao_em?: string | null;
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
          dre_linha?: string | null;
          dre_detalhe?: string | null;
          dre_classificacao_origem?: string | null;
          dre_classificacao_em?: string | null;
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
          tipo: string | null;
          departamento: string | null;
          unidade: string | null;
          filial: string | null;
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
          tipo?: string | null;
          departamento?: string | null;
          unidade?: string | null;
          filial?: string | null;
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
          tipo?: string | null;
          departamento?: string | null;
          unidade?: string | null;
          filial?: string | null;
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
          dre_linha: string | null;
          dre_detalhe: string | null;
          dre_classificacao_origem: string | null;
          dre_classificacao_em: string | null;
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
          dre_linha?: string | null;
          dre_detalhe?: string | null;
          dre_classificacao_origem?: string | null;
          dre_classificacao_em?: string | null;
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
          dre_linha?: string | null;
          dre_detalhe?: string | null;
          dre_classificacao_origem?: string | null;
          dre_classificacao_em?: string | null;
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
          nome_fantasia: string | null;
          tipo_pessoa: string | null;
          documento: string | null;
          email: string | null;
          telefone: string | null;
          cep: string | null;
          rua: string | null;
          numero: string | null;
          complemento: string | null;
          bairro: string | null;
          cidade: string | null;
          estado: string | null;
          categoria_financeira_id: string | null;
          plano_conta_id: string | null;
          centro_custo_id: string | null;
          forma_pagamento_id: string | null;
          conta_bancaria_id: string | null;
          prazo_medio_dias: number | null;
          recorrente: boolean;
          frequencia: string | null;
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
          nome_fantasia?: string | null;
          tipo_pessoa?: string | null;
          documento?: string | null;
          email?: string | null;
          telefone?: string | null;
          cep?: string | null;
          rua?: string | null;
          numero?: string | null;
          complemento?: string | null;
          bairro?: string | null;
          cidade?: string | null;
          estado?: string | null;
          categoria_financeira_id?: string | null;
          plano_conta_id?: string | null;
          centro_custo_id?: string | null;
          forma_pagamento_id?: string | null;
          conta_bancaria_id?: string | null;
          prazo_medio_dias?: number | null;
          recorrente?: boolean;
          frequencia?: string | null;
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
          nome_fantasia?: string | null;
          tipo_pessoa?: string | null;
          documento?: string | null;
          email?: string | null;
          telefone?: string | null;
          cep?: string | null;
          rua?: string | null;
          numero?: string | null;
          complemento?: string | null;
          bairro?: string | null;
          cidade?: string | null;
          estado?: string | null;
          categoria_financeira_id?: string | null;
          plano_conta_id?: string | null;
          centro_custo_id?: string | null;
          forma_pagamento_id?: string | null;
          conta_bancaria_id?: string | null;
          prazo_medio_dias?: number | null;
          recorrente?: boolean;
          frequencia?: string | null;
          observacoes?: string | null;
          ativo?: boolean;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fornecedores_categoria_financeira_id_fkey";
            columns: ["categoria_financeira_id"];
            isOneToOne: false;
            referencedRelation: "categorias_financeiras";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fornecedores_plano_conta_id_fkey";
            columns: ["plano_conta_id"];
            isOneToOne: false;
            referencedRelation: "plano_contas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fornecedores_centro_custo_id_fkey";
            columns: ["centro_custo_id"];
            isOneToOne: false;
            referencedRelation: "centros_custo";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fornecedores_forma_pagamento_id_fkey";
            columns: ["forma_pagamento_id"];
            isOneToOne: false;
            referencedRelation: "formas_pagamento";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fornecedores_conta_bancaria_id_fkey";
            columns: ["conta_bancaria_id"];
            isOneToOne: false;
            referencedRelation: "contas_bancarias";
            referencedColumns: ["id"];
          },
        ];
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
      contas_pagar_rateios: {
        Row: {
          id: string;
          tenant_id: string;
          conta_pagar_id: string;
          centro_custo_id: string;
          percentual: number;
          valor: number;
          descricao: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          conta_pagar_id: string;
          centro_custo_id: string;
          percentual: number;
          valor: number;
          descricao?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          conta_pagar_id?: string;
          centro_custo_id?: string;
          percentual?: number;
          valor?: number;
          descricao?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "contas_pagar_rateios_conta_pagar_id_fkey";
            columns: ["conta_pagar_id"];
            isOneToOne: false;
            referencedRelation: "contas_pagar";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contas_pagar_rateios_centro_custo_id_fkey";
            columns: ["centro_custo_id"];
            isOneToOne: false;
            referencedRelation: "centros_custo";
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
      veiculos: {
        Row: {
          id: string;
          tenant_id: string;
          cliente_id: string;
          placa: string;
          marca: string | null;
          modelo: string | null;
          versao: string | null;
          ano: number | null;
          cor: string | null;
          combustivel: string | null;
          cambio: string | null;
          quilometragem: number | null;
          chassi: string | null;
          observacoes: string | null;
          ativo: boolean;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          cliente_id: string;
          placa: string;
          marca?: string | null;
          modelo?: string | null;
          versao?: string | null;
          ano?: number | null;
          cor?: string | null;
          combustivel?: string | null;
          cambio?: string | null;
          quilometragem?: number | null;
          chassi?: string | null;
          observacoes?: string | null;
          ativo?: boolean;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          cliente_id?: string;
          placa?: string;
          marca?: string | null;
          modelo?: string | null;
          versao?: string | null;
          ano?: number | null;
          cor?: string | null;
          combustivel?: string | null;
          cambio?: string | null;
          quilometragem?: number | null;
          chassi?: string | null;
          observacoes?: string | null;
          ativo?: boolean;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      ordens_servico: {
        Row: {
          id: string;
          tenant_id: string;
          numero: number;
          cliente_id: string;
          veiculo_id: string | null;
          status: string;
          mecanico_id: string | null;
          consultor_id: string | null;
          centro_custo_id: string | null;
          data_abertura: string;
          data_conclusao: string | null;
          data_hora_entrada: string | null;
          previsao_entrega: string | null;
          previsao_entrega_revisada: string | null;
          quilometragem_entrada: number | null;
          quilometragem_saida: number | null;
          reclamacao_cliente: string | null;
          observacoes: string | null;
          nivel_combustivel: string | null;
          objetos_deixados: string | null;
          danos_aparentes: string | null;
          origem_atendimento: string | null;
          prioridade: string;
          subtotal: number;
          desconto_total: number;
          acrescimo_total: number;
          descricao: string | null;
          valor_total: number;
          venda_id: string | null;
          faturado_em: string | null;
          garantia_dias: number | null;
          aceite_entrega_em: string | null;
          aceite_entrega_por: string | null;
          responsavel_recebimento_id: string | null;
          ordem_retorno_id: string | null;
          tipo_abertura: string;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          numero?: never;
          cliente_id: string;
          veiculo_id?: string | null;
          status?: string;
          mecanico_id?: string | null;
          consultor_id?: string | null;
          centro_custo_id?: string | null;
          data_abertura?: string;
          data_conclusao?: string | null;
          data_hora_entrada?: string | null;
          previsao_entrega?: string | null;
          previsao_entrega_revisada?: string | null;
          quilometragem_entrada?: number | null;
          quilometragem_saida?: number | null;
          reclamacao_cliente?: string | null;
          observacoes?: string | null;
          nivel_combustivel?: string | null;
          objetos_deixados?: string | null;
          danos_aparentes?: string | null;
          origem_atendimento?: string | null;
          prioridade?: string;
          subtotal?: number;
          desconto_total?: number;
          acrescimo_total?: number;
          descricao?: string | null;
          valor_total?: number;
          venda_id?: string | null;
          faturado_em?: string | null;
          garantia_dias?: number | null;
          aceite_entrega_em?: string | null;
          aceite_entrega_por?: string | null;
          responsavel_recebimento_id?: string | null;
          ordem_retorno_id?: string | null;
          tipo_abertura?: string;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          numero?: never;
          cliente_id?: string;
          veiculo_id?: string | null;
          status?: string;
          mecanico_id?: string | null;
          consultor_id?: string | null;
          centro_custo_id?: string | null;
          data_abertura?: string;
          data_conclusao?: string | null;
          data_hora_entrada?: string | null;
          previsao_entrega?: string | null;
          previsao_entrega_revisada?: string | null;
          quilometragem_entrada?: number | null;
          quilometragem_saida?: number | null;
          reclamacao_cliente?: string | null;
          observacoes?: string | null;
          nivel_combustivel?: string | null;
          objetos_deixados?: string | null;
          danos_aparentes?: string | null;
          origem_atendimento?: string | null;
          prioridade?: string;
          subtotal?: number;
          desconto_total?: number;
          acrescimo_total?: number;
          descricao?: string | null;
          valor_total?: number;
          venda_id?: string | null;
          faturado_em?: string | null;
          garantia_dias?: number | null;
          aceite_entrega_em?: string | null;
          aceite_entrega_por?: string | null;
          responsavel_recebimento_id?: string | null;
          ordem_retorno_id?: string | null;
          tipo_abertura?: string;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ordens_servico_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "clientes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ordens_servico_veiculo_id_fkey";
            columns: ["veiculo_id"];
            isOneToOne: false;
            referencedRelation: "veiculos";
            referencedColumns: ["id"];
          },
        ];
      };
      ordem_servico_itens: {
        Row: {
          id: string;
          tenant_id: string;
          ordem_servico_id: string;
          produto_id: string | null;
          descricao: string;
          tipo_item: string;
          categoria_item: string;
          mecanico_id: string | null;
          quantidade: number;
          valor_unitario: number;
          desconto: number;
          acrescimo: number;
          valor_total: number;
          custo_unitario: number | null;
          aprovacao_status: string;
          aprovacao_motivo: string | null;
          aprovacao_em: string | null;
          aprovacao_canal: string | null;
          estoque_status: string;
          peca_origem: string;
          fornecedor_sugerido_id: string | null;
          execucao_status: string;
          execucao_inicio: string | null;
          execucao_fim: string | null;
          horas_previstas: number | null;
          horas_realizadas: number | null;
          observacoes: string | null;
          prazo_peca: string | null;
          ordem: number;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          ordem_servico_id: string;
          produto_id?: string | null;
          descricao: string;
          tipo_item?: string;
          categoria_item?: string;
          mecanico_id?: string | null;
          quantidade?: number;
          valor_unitario?: number;
          desconto?: number;
          acrescimo?: number;
          valor_total?: number;
          custo_unitario?: number | null;
          aprovacao_status?: string;
          aprovacao_motivo?: string | null;
          aprovacao_em?: string | null;
          aprovacao_canal?: string | null;
          estoque_status?: string;
          peca_origem?: string;
          fornecedor_sugerido_id?: string | null;
          execucao_status?: string;
          execucao_inicio?: string | null;
          execucao_fim?: string | null;
          horas_previstas?: number | null;
          horas_realizadas?: number | null;
          observacoes?: string | null;
          prazo_peca?: string | null;
          ordem?: number;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          ordem_servico_id?: string;
          produto_id?: string | null;
          descricao?: string;
          tipo_item?: string;
          categoria_item?: string;
          mecanico_id?: string | null;
          quantidade?: number;
          valor_unitario?: number;
          desconto?: number;
          acrescimo?: number;
          valor_total?: number;
          custo_unitario?: number | null;
          aprovacao_status?: string;
          aprovacao_motivo?: string | null;
          aprovacao_em?: string | null;
          aprovacao_canal?: string | null;
          estoque_status?: string;
          peca_origem?: string;
          fornecedor_sugerido_id?: string | null;
          execucao_status?: string;
          execucao_inicio?: string | null;
          execucao_fim?: string | null;
          horas_previstas?: number | null;
          horas_realizadas?: number | null;
          observacoes?: string | null;
          prazo_peca?: string | null;
          ordem?: number;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      retornos_servico: {
        Row: {
          id: string;
          tenant_id: string;
          numero: number;
          ordem_servico_id: string;
          cliente_id: string;
          veiculo_id: string | null;
          mecanico_id: string | null;
          servico_produto_id: string | null;
          categoria_id: string | null;
          data_retorno: string;
          data_servico_original: string;
          motivo: string;
          valor_retorno: number;
          valor_pecas_garantia: number;
          horas_mao_obra: number;
          valor_mao_obra: number;
          tipo_cobertura: string;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          numero?: never;
          ordem_servico_id: string;
          cliente_id: string;
          veiculo_id?: string | null;
          mecanico_id?: string | null;
          servico_produto_id?: string | null;
          categoria_id?: string | null;
          data_retorno?: string;
          data_servico_original: string;
          motivo: string;
          valor_retorno?: number;
          valor_pecas_garantia?: number;
          horas_mao_obra?: number;
          valor_mao_obra?: number;
          tipo_cobertura?: string;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          numero?: never;
          ordem_servico_id?: string;
          cliente_id?: string;
          veiculo_id?: string | null;
          mecanico_id?: string | null;
          servico_produto_id?: string | null;
          categoria_id?: string | null;
          data_retorno?: string;
          data_servico_original?: string;
          motivo?: string;
          valor_retorno?: number;
          valor_pecas_garantia?: number;
          horas_mao_obra?: number;
          valor_mao_obra?: number;
          tipo_cobertura?: string;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      metas_vendas_mensais: {
        Row: {
          id: string;
          tenant_id: string;
          competencia: string;
          valor_meta: number;
          centro_custo_id: string | null;
          observacao: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          competencia: string;
          valor_meta: number;
          centro_custo_id?: string | null;
          observacao?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          competencia?: string;
          valor_meta?: number;
          centro_custo_id?: string | null;
          observacao?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      dashboard_layouts: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string;
          name: string;
          preset_key: string | null;
          layout_data: Json;
          density: string | null;
          is_default: boolean;
          is_active: boolean;
          version: number;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          user_id: string;
          name: string;
          preset_key?: string | null;
          layout_data: Json;
          density?: string | null;
          is_default?: boolean;
          is_active?: boolean;
          version?: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          user_id?: string;
          name?: string;
          preset_key?: string | null;
          layout_data?: Json;
          density?: string | null;
          is_default?: boolean;
          is_active?: boolean;
          version?: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      tags: {
        Row: {
          id: string;
          tenant_id: string;
          nome: string;
          slug: string;
          cor: string | null;
          ativo: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          nome: string;
          slug: string;
          cor?: string | null;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          nome?: string;
          slug?: string;
          cor?: string | null;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      entity_tags: {
        Row: {
          id: string;
          tenant_id: string;
          tag_id: string;
          entity_type: string;
          entity_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          tag_id: string;
          entity_type: string;
          entity_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          tag_id?: string;
          entity_type?: string;
          entity_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "entity_tags_tag_id_fkey";
            columns: ["tag_id"];
            isOneToOne: false;
            referencedRelation: "tags";
            referencedColumns: ["id"];
          },
        ];
      };
      financeiro_lancamento_eventos: {
        Row: {
          id: string;
          tenant_id: string;
          entity_type: string;
          entity_id: string;
          action: string;
          motivo: string | null;
          payload_antes: Json | null;
          payload_depois: Json | null;
          user_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          entity_type: string;
          entity_id: string;
          action: string;
          motivo?: string | null;
          payload_antes?: Json | null;
          payload_depois?: Json | null;
          user_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          entity_type?: string;
          entity_id?: string;
          action?: string;
          motivo?: string | null;
          payload_antes?: Json | null;
          payload_depois?: Json | null;
          user_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      oficina_textos: {
        Row: {
          id: string;
          tenant_id: string;
          chave: string;
          conteudo: string;
          versao: number;
          ativo: boolean;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          chave: string;
          conteudo: string;
          versao?: number;
          ativo?: boolean;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          chave?: string;
          conteudo?: string;
          versao?: number;
          ativo?: boolean;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      ordem_servico_checklist: {
        Row: {
          id: string;
          tenant_id: string;
          ordem_servico_id: string;
          item_codigo: string;
          item_label: string;
          status: string;
          classificacao: string;
          categoria: string | null;
          etapa_inspecao: string;
          quilometragem: number | null;
          ordem: number;
          observacao: string | null;
          responsavel_id: string | null;
          registrado_em: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          ordem_servico_id: string;
          item_codigo: string;
          item_label: string;
          status?: string;
          classificacao?: string;
          categoria?: string | null;
          etapa_inspecao?: string;
          quilometragem?: number | null;
          ordem?: number;
          observacao?: string | null;
          responsavel_id?: string | null;
          registrado_em?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          ordem_servico_id?: string;
          item_codigo?: string;
          item_label?: string;
          status?: string;
          classificacao?: string;
          categoria?: string | null;
          etapa_inspecao?: string;
          quilometragem?: number | null;
          ordem?: number;
          observacao?: string | null;
          responsavel_id?: string | null;
          registrado_em?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      ordem_servico_diagnosticos: {
        Row: {
          id: string;
          tenant_id: string;
          ordem_servico_id: string;
          sintoma_relatado: string | null;
          diagnostico_tecnico: string | null;
          causa_provavel: string | null;
          recomendacao: string | null;
          gravidade: string | null;
          urgencia: string | null;
          testes_realizados: string | null;
          pecas_necessarias: string | null;
          servicos_necessarios: string | null;
          observacoes_internas: string | null;
          observacoes_cliente: string | null;
          registrado_em: string;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          ordem_servico_id: string;
          sintoma_relatado?: string | null;
          diagnostico_tecnico?: string | null;
          causa_provavel?: string | null;
          recomendacao?: string | null;
          gravidade?: string | null;
          urgencia?: string | null;
          testes_realizados?: string | null;
          pecas_necessarias?: string | null;
          servicos_necessarios?: string | null;
          observacoes_internas?: string | null;
          observacoes_cliente?: string | null;
          registrado_em?: string;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          ordem_servico_id?: string;
          sintoma_relatado?: string | null;
          diagnostico_tecnico?: string | null;
          causa_provavel?: string | null;
          recomendacao?: string | null;
          gravidade?: string | null;
          urgencia?: string | null;
          testes_realizados?: string | null;
          pecas_necessarias?: string | null;
          servicos_necessarios?: string | null;
          observacoes_internas?: string | null;
          observacoes_cliente?: string | null;
          registrado_em?: string;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      ordem_servico_anexos: {
        Row: {
          id: string;
          tenant_id: string;
          ordem_servico_id: string;
          item_id: string | null;
          checklist_item_id: string | null;
          diagnostico_id: string | null;
          etapa: string;
          tipo: string;
          descricao: string | null;
          legenda: string | null;
          observacao: string | null;
          ordem: number;
          sha256: string | null;
          largura: number | null;
          altura: number | null;
          storage_path: string | null;
          mime_type: string | null;
          tamanho_bytes: number | null;
          user_id: string | null;
          deleted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          ordem_servico_id: string;
          item_id?: string | null;
          checklist_item_id?: string | null;
          diagnostico_id?: string | null;
          etapa?: string;
          tipo?: string;
          descricao?: string | null;
          legenda?: string | null;
          observacao?: string | null;
          ordem?: number;
          sha256?: string | null;
          largura?: number | null;
          altura?: number | null;
          storage_path?: string | null;
          mime_type?: string | null;
          tamanho_bytes?: number | null;
          user_id?: string | null;
          deleted_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          ordem_servico_id?: string;
          item_id?: string | null;
          checklist_item_id?: string | null;
          diagnostico_id?: string | null;
          etapa?: string;
          tipo?: string;
          descricao?: string | null;
          legenda?: string | null;
          observacao?: string | null;
          ordem?: number;
          sha256?: string | null;
          largura?: number | null;
          altura?: number | null;
          storage_path?: string | null;
          mime_type?: string | null;
          tamanho_bytes?: number | null;
          user_id?: string | null;
          deleted_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      ordem_servico_eventos: {
        Row: {
          id: string;
          tenant_id: string;
          ordem_servico_id: string;
          tipo: string;
          descricao: string;
          estado_anterior: string | null;
          estado_posterior: string | null;
          motivo: string | null;
          entidade_tipo: string | null;
          entidade_id: string | null;
          user_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          ordem_servico_id: string;
          tipo: string;
          descricao: string;
          estado_anterior?: string | null;
          estado_posterior?: string | null;
          motivo?: string | null;
          entidade_tipo?: string | null;
          entidade_id?: string | null;
          user_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          ordem_servico_id?: string;
          tipo?: string;
          descricao?: string;
          estado_anterior?: string | null;
          estado_posterior?: string | null;
          motivo?: string | null;
          entidade_tipo?: string | null;
          entidade_id?: string | null;
          user_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      ordem_servico_previsoes: {
        Row: {
          id: string;
          tenant_id: string;
          ordem_servico_id: string;
          previsao_anterior: string | null;
          previsao_nova: string;
          motivo: string | null;
          user_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          ordem_servico_id: string;
          previsao_anterior?: string | null;
          previsao_nova: string;
          motivo?: string | null;
          user_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          ordem_servico_id?: string;
          previsao_anterior?: string | null;
          previsao_nova?: string;
          motivo?: string | null;
          user_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      ordem_servico_orcamento_versoes: {
        Row: {
          id: string;
          tenant_id: string;
          ordem_servico_id: string;
          versao: number;
          status: string;
          subtotal: number;
          desconto_total: number;
          acrescimo_total: number;
          valor_total: number;
          prazo_estimado_dias: number | null;
          aviso_texto: string;
          aviso_versao: number;
          validade_ate: string | null;
          publicado_em: string | null;
          publicado_por: string | null;
          supersede_de: string | null;
          justificativa_revisao: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          ordem_servico_id: string;
          versao: number;
          status?: string;
          subtotal?: number;
          desconto_total?: number;
          acrescimo_total?: number;
          valor_total?: number;
          prazo_estimado_dias?: number | null;
          aviso_texto: string;
          aviso_versao?: number;
          validade_ate?: string | null;
          publicado_em?: string | null;
          publicado_por?: string | null;
          supersede_de?: string | null;
          justificativa_revisao?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          ordem_servico_id?: string;
          versao?: number;
          status?: string;
          subtotal?: number;
          desconto_total?: number;
          acrescimo_total?: number;
          valor_total?: number;
          prazo_estimado_dias?: number | null;
          aviso_texto?: string;
          aviso_versao?: number;
          validade_ate?: string | null;
          publicado_em?: string | null;
          publicado_por?: string | null;
          supersede_de?: string | null;
          justificativa_revisao?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      ordem_servico_orcamento_itens: {
        Row: {
          id: string;
          tenant_id: string;
          versao_id: string;
          item_origem_id: string | null;
          descricao: string;
          tipo_item: string;
          categoria_item: string;
          quantidade: number;
          valor_unitario: number;
          desconto: number;
          acrescimo: number;
          valor_total: number;
          produto_id: string | null;
          recomendacao: string;
          prazo_peca: string | null;
          disponibilidade: string | null;
          ordem: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          versao_id: string;
          item_origem_id?: string | null;
          descricao: string;
          tipo_item: string;
          categoria_item: string;
          quantidade?: number;
          valor_unitario?: number;
          desconto?: number;
          acrescimo?: number;
          valor_total?: number;
          produto_id?: string | null;
          recomendacao?: string;
          prazo_peca?: string | null;
          disponibilidade?: string | null;
          ordem?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          versao_id?: string;
          item_origem_id?: string | null;
          descricao?: string;
          tipo_item?: string;
          categoria_item?: string;
          quantidade?: number;
          valor_unitario?: number;
          desconto?: number;
          acrescimo?: number;
          valor_total?: number;
          produto_id?: string | null;
          recomendacao?: string;
          prazo_peca?: string | null;
          disponibilidade?: string | null;
          ordem?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      ordem_servico_compartilhamentos: {
        Row: {
          id: string;
          tenant_id: string;
          ordem_servico_id: string;
          versao_orcamento_id: string | null;
          token_hash: string;
          token_prefix: string;
          canal: string;
          destinatario: string | null;
          status: string;
          expira_em: string;
          revogado_em: string | null;
          visualizacoes: number;
          ultima_visualizacao_em: string | null;
          criado_por: string | null;
          mensagem_template: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          ordem_servico_id: string;
          versao_orcamento_id?: string | null;
          token_hash: string;
          token_prefix: string;
          canal?: string;
          destinatario?: string | null;
          status?: string;
          expira_em: string;
          revogado_em?: string | null;
          visualizacoes?: number;
          ultima_visualizacao_em?: string | null;
          criado_por?: string | null;
          mensagem_template?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          ordem_servico_id?: string;
          versao_orcamento_id?: string | null;
          token_hash?: string;
          token_prefix?: string;
          canal?: string;
          destinatario?: string | null;
          status?: string;
          expira_em?: string;
          revogado_em?: string | null;
          visualizacoes?: number;
          ultima_visualizacao_em?: string | null;
          criado_por?: string | null;
          mensagem_template?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      ordem_servico_compartilhamento_views: {
        Row: {
          id: string;
          tenant_id: string;
          compartilhamento_id: string;
          ip_hash: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          compartilhamento_id: string;
          ip_hash?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          compartilhamento_id?: string;
          ip_hash?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      ordem_servico_aprovacoes: {
        Row: {
          id: string;
          tenant_id: string;
          ordem_servico_id: string;
          versao_orcamento_id: string;
          compartilhamento_id: string | null;
          modo: string;
          canal: string;
          nome_informado: string | null;
          observacao_cliente: string | null;
          aceite_aviso: boolean;
          aviso_versao: number;
          ip_hash: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          ordem_servico_id: string;
          versao_orcamento_id: string;
          compartilhamento_id?: string | null;
          modo: string;
          canal?: string;
          nome_informado?: string | null;
          observacao_cliente?: string | null;
          aceite_aviso?: boolean;
          aviso_versao?: number;
          ip_hash?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          ordem_servico_id?: string;
          versao_orcamento_id?: string;
          compartilhamento_id?: string | null;
          modo?: string;
          canal?: string;
          nome_informado?: string | null;
          observacao_cliente?: string | null;
          aceite_aviso?: boolean;
          aviso_versao?: number;
          ip_hash?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      ordem_servico_aprovacao_itens: {
        Row: {
          id: string;
          tenant_id: string;
          aprovacao_id: string;
          orcamento_item_id: string;
          item_origem_id: string | null;
          decisao: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          aprovacao_id: string;
          orcamento_item_id: string;
          item_origem_id?: string | null;
          decisao: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          aprovacao_id?: string;
          orcamento_item_id?: string;
          item_origem_id?: string | null;
          decisao?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      assert_tenant_member: {
        Args: { p_tenant_id: string };
        Returns: undefined;
      };
      inspecao_publica_por_token: {
        Args: { p_token: string };
        Returns: Json;
      };
      inspecao_publica_detalhes: {
        Args: { p_token: string };
        Returns: Json;
      };
      inspecao_publica_aprovar: {
        Args: {
          p_token: string;
          p_modo: string;
          p_nome: string;
          p_observacao: string;
          p_aceite_aviso: boolean;
          p_itens: Json;
          p_ip_hash?: string | null;
          p_user_agent?: string | null;
        };
        Returns: Json;
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
      registrar_movimentacao_bancaria_atomico: {
        Args: {
          p_tenant_id: string;
          p_conta_bancaria_id: string;
          p_tipo: string;
          p_valor: number;
          p_data_movimentacao: string;
          p_descricao: string;
          p_origem?: string;
          p_conta_pagar_id?: string | null;
          p_conta_receber_id?: string | null;
          p_observacoes?: string | null;
          p_created_by?: string | null;
        };
        Returns: string;
      };
      transferir_entre_contas_atomico: {
        Args: {
          p_tenant_id: string;
          p_conta_origem_id: string;
          p_conta_destino_id: string;
          p_valor: number;
          p_data_movimentacao: string;
          p_descricao: string;
          p_observacoes?: string | null;
          p_created_by?: string | null;
        };
        Returns: Json;
      };
      estornar_movimentacao_bancaria_atomico: {
        Args: {
          p_tenant_id: string;
          p_movimentacao_id: string;
          p_data_movimentacao: string;
          p_observacoes?: string | null;
          p_created_by?: string | null;
        };
        Returns: string;
      };
      baixar_conta_pagar_atomico: {
        Args: {
          p_tenant_id: string;
          p_conta_pagar_id: string;
          p_data_pagamento: string;
          p_conta_bancaria_id?: string | null;
          p_valor_pagamento?: number | null;
          p_desconto?: number | null;
          p_juros?: number | null;
          p_multa?: number | null;
          p_forma_pagamento_id?: string | null;
          p_created_by?: string | null;
        };
        Returns: string;
      };
      baixar_conta_receber_atomico: {
        Args: {
          p_tenant_id: string;
          p_conta_receber_id: string;
          p_data_recebimento: string;
          p_conta_bancaria_id?: string | null;
          p_valor_recebido?: number | null;
          p_desconto?: number | null;
          p_juros?: number | null;
          p_multa?: number | null;
          p_created_by?: string | null;
        };
        Returns: string;
      };
      faturar_e_receber_venda_atomico: {
        Args: {
          p_tenant_id: string;
          p_venda_id: string;
          p_conta_bancaria_id: string;
          p_data_recebimento?: string;
          p_created_by?: string | null;
        };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
  };
};
