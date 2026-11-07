CREATE TABLE "fontes_brutas" (
	"id" serial PRIMARY KEY NOT NULL,
	"fonte" text NOT NULL,
	"obtido_em" timestamp with time zone NOT NULL,
	"status" integer NOT NULL,
	"tipo" text,
	"tamanho" integer NOT NULL,
	"conteudo" text NOT NULL,
	CONSTRAINT "fontes_brutas_unica" UNIQUE("fonte","obtido_em")
);
--> statement-breakpoint
CREATE TABLE "fontes_status" (
	"fonte" text PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"grupo" text NOT NULL,
	"ultima_tentativa" timestamp with time zone NOT NULL,
	"ultimo_sucesso" timestamp with time zone,
	"dado_de" timestamp with time zone,
	"erro" text
);
--> statement-breakpoint
CREATE TABLE "niveis_represa" (
	"represa" text NOT NULL,
	"data" date NOT NULL,
	"nivel" real NOT NULL,
	"volume" real,
	"origem" text NOT NULL,
	CONSTRAINT "niveis_represa_represa_data_pk" PRIMARY KEY("represa","data")
);
--> statement-breakpoint
CREATE TABLE "observacoes" (
	"ponto" text NOT NULL,
	"variavel" text NOT NULL,
	"data" date NOT NULL,
	"faixa" smallint NOT NULL,
	"valor" real NOT NULL,
	"origem" text NOT NULL,
	CONSTRAINT "observacoes_ponto_variavel_data_faixa_pk" PRIMARY KEY("ponto","variavel","data","faixa")
);
--> statement-breakpoint
CREATE TABLE "precisao" (
	"data" date PRIMARY KEY NOT NULL,
	"resumo" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "previsoes_modelos" (
	"id" serial PRIMARY KEY NOT NULL,
	"ponto" text NOT NULL,
	"modelo" text NOT NULL,
	"variavel" text NOT NULL,
	"data_alvo" date NOT NULL,
	"faixa" smallint NOT NULL,
	"antecedencia" smallint NOT NULL,
	"valor" real NOT NULL,
	"criado_em" date NOT NULL,
	CONSTRAINT "previsoes_modelos_unica" UNIQUE("ponto","modelo","variavel","data_alvo","faixa","antecedencia")
);
--> statement-breakpoint
ALTER TABLE "locais" ADD COLUMN "estacao" text;--> statement-breakpoint
ALTER TABLE "locais" ADD COLUMN "represa" text;--> statement-breakpoint
UPDATE "locais" SET "represa" = 'campos-novos' WHERE "id" = 'represa-cerro-negro' AND "represa" IS NULL;