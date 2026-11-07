CREATE TABLE "capturas" (
	"id" serial PRIMARY KEY NOT NULL,
	"saida_id" integer NOT NULL,
	"especie" text NOT NULL,
	"quantidade" integer NOT NULL,
	"tamanho_cm" real
);
--> statement-breakpoint
CREATE TABLE "locais" (
	"id" text PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"tipo" text NOT NULL,
	"lat" real NOT NULL,
	"lon" real NOT NULL,
	"calib_a" real,
	"calib_b" real,
	"calib_n" integer
);
--> statement-breakpoint
CREATE TABLE "medicoes_agua" (
	"id" serial PRIMARY KEY NOT NULL,
	"local_id" text NOT NULL,
	"medido_em" timestamp with time zone DEFAULT now() NOT NULL,
	"temperatura" real NOT NULL,
	"media_ar" real
);
--> statement-breakpoint
CREATE TABLE "previsoes" (
	"id" serial PRIMARY KEY NOT NULL,
	"data_alvo" date NOT NULL,
	"criado_em" date NOT NULL,
	"local_id" text NOT NULL,
	"especie" text NOT NULL,
	"nota" integer,
	"faixa_min" integer,
	"faixa_max" integer,
	"fatores" jsonb,
	CONSTRAINT "previsoes_unica" UNIQUE("data_alvo","criado_em","local_id","especie")
);
--> statement-breakpoint
CREATE TABLE "saidas" (
	"id" serial PRIMARY KEY NOT NULL,
	"cliente_id" uuid NOT NULL,
	"data" date NOT NULL,
	"inicio" text NOT NULL,
	"fim" text NOT NULL,
	"local_id" text NOT NULL,
	"especie_alvo" text NOT NULL,
	"isca" text,
	"apelido" text,
	"nota" integer,
	"fatores" jsonb,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saidas_cliente_id_unique" UNIQUE("cliente_id")
);
--> statement-breakpoint
ALTER TABLE "capturas" ADD CONSTRAINT "capturas_saida_id_saidas_id_fk" FOREIGN KEY ("saida_id") REFERENCES "public"."saidas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medicoes_agua" ADD CONSTRAINT "medicoes_agua_local_id_locais_id_fk" FOREIGN KEY ("local_id") REFERENCES "public"."locais"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "previsoes" ADD CONSTRAINT "previsoes_local_id_locais_id_fk" FOREIGN KEY ("local_id") REFERENCES "public"."locais"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saidas" ADD CONSTRAINT "saidas_local_id_locais_id_fk" FOREIGN KEY ("local_id") REFERENCES "public"."locais"("id") ON DELETE no action ON UPDATE no action;