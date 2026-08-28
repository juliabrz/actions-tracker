import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  /**
   * O PGlite carrega WASM e fala com o sistema de arquivos do Node. Empacotado
   * pelo bundler, ele recebe um polyfill de `URL` que não é a classe nativa —
   * e o `fs` do Node rejeita com "Received an instance of URL", que parece
   * absurdo até se perceber que são duas classes `URL` distintas.
   *
   * Marcado como externo, é carregado de node_modules em tempo de execução e
   * usa os globais reais.
   */
  serverExternalPackages: ["@electric-sql/pglite"],
}

export default nextConfig
