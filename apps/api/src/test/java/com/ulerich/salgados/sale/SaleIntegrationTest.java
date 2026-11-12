package com.ulerich.salgados.sale;

import com.ulerich.salgados.TestcontainersConfiguration;
import com.ulerich.salgados.product.Product;
import com.ulerich.salgados.product.ProductRepository;
import com.ulerich.salgados.user.User;
import com.ulerich.salgados.user.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import tools.jackson.databind.ObjectMapper;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
class SaleIntegrationTest {

    @Autowired
    private WebApplicationContext context;

    @Autowired
    private SaleRepository saleRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ObjectMapper objectMapper;

    private MockMvc mockMvc;
    private User loggedUser;
    private User otherUser;
    private String token;
    private Product coxinha;
    private Product risole;

    @BeforeEach
    void setUp() throws Exception {
        this.mockMvc = MockMvcBuilders.webAppContextSetup(context)
                .apply(springSecurity())
                .build();

        saleRepository.deleteAll();
        productRepository.deleteAll();
        userRepository.deleteAll();

        loggedUser = userRepository.save(new User(
                "Vendedor Principal",
                "vendedor@salgados.com",
                passwordEncoder.encode("senha123")
        ));

        otherUser = userRepository.save(new User(
                "Outro Vendedor",
                "outro@salgados.com",
                passwordEncoder.encode("senha123")
        ));

        coxinha = productRepository.save(new Product(loggedUser.getId(), "Coxinha", 650, true));
        risole = productRepository.save(new Product(loggedUser.getId(), "Risole", 500, true));

        String loginPayload = """
                {
                  "email": "vendedor@salgados.com",
                  "password": "senha123"
                }
                """;

        MvcResult loginResult = mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginPayload))
                .andExpect(status().isOk())
                .andReturn();

        token = objectMapper.readTree(loginResult.getResponse().getContentAsString())
                .get("accessToken")
                .asString();
    }

    @AfterEach
    void tearDown() {
        saleRepository.deleteAll();
        productRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void vendaComDoisItensCalculaTotalCorretoEGravaSnapshot() throws Exception {
        String payload = """
                {
                  "items": [
                    { "productId": %d, "quantity": 2 },
                    { "productId": %d, "quantity": 3 }
                  ],
                  "paymentMethod": "PIX",
                  "customerName": "Carlos",
                  "notes": "Sem guardanapo"
                }
                """.formatted(coxinha.getId(), risole.getId());

        mockMvc.perform(post("/sales")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.totalCents").value(2800))
                .andExpect(jsonPath("$.paymentMethod").value("PIX"))
                .andExpect(jsonPath("$.paymentStatus").value("PAGO"))
                .andExpect(jsonPath("$.customerName").value("Carlos"))
                .andExpect(jsonPath("$.notes").value("Sem guardanapo"))
                .andExpect(jsonPath("$.items", hasSize(2)))
                .andExpect(jsonPath("$.items[0].productId").value(coxinha.getId()))
                .andExpect(jsonPath("$.items[0].name").value("Coxinha"))
                .andExpect(jsonPath("$.items[0].unitPriceCents").value(650))
                .andExpect(jsonPath("$.items[0].quantity").value(2))
                .andExpect(jsonPath("$.items[0].subtotalCents").value(1300))
                .andExpect(jsonPath("$.items[1].productId").value(risole.getId()))
                .andExpect(jsonPath("$.items[1].name").value("Risole"))
                .andExpect(jsonPath("$.items[1].unitPriceCents").value(500))
                .andExpect(jsonPath("$.items[1].quantity").value(3))
                .andExpect(jsonPath("$.items[1].subtotalCents").value(1500));
    }

    @Test
    void alterarPrecoDoProdutoDepoisNaoMudaVendaJaFeita() throws Exception {
        String salePayload = """
                {
                  "items": [
                    { "productId": %d, "quantity": 2 }
                  ],
                  "paymentMethod": "DINHEIRO"
                }
                """.formatted(coxinha.getId());

        MvcResult createResult = mockMvc.perform(post("/sales")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(salePayload))
                .andExpect(status().isCreated())
                .andReturn();

        Long saleId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .get("id")
                .asLong();

        String updateProductPayload = """
                {
                  "name": "Coxinha Gourmet",
                  "priceCents": 1200,
                  "active": true
                }
                """;

        mockMvc.perform(put("/products/" + coxinha.getId())
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updateProductPayload))
                .andExpect(status().isOk());

        mockMvc.perform(get("/sales/" + saleId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalCents").value(1300))
                .andExpect(jsonPath("$.items[0].name").value("Coxinha"))
                .andExpect(jsonPath("$.items[0].unitPriceCents").value(650))
                .andExpect(jsonPath("$.items[0].subtotalCents").value(1300));
    }

    @Test
    void vendaRapidaComTotalCentsSemItens() throws Exception {
        String payload = """
                {
                  "totalCents": 1500,
                  "paymentMethod": "CARTAO",
                  "paymentStatus": "PENDENTE"
                }
                """;

        mockMvc.perform(post("/sales")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.totalCents").value(1500))
                .andExpect(jsonPath("$.paymentMethod").value("CARTAO"))
                .andExpect(jsonPath("$.paymentStatus").value("PENDENTE"))
                .andExpect(jsonPath("$.items", hasSize(0)));
    }

    @Test
    void itensETotalCentsJuntosOuNenhumDosDoisRetornam400() throws Exception {
        String bothPayload = """
                {
                  "items": [
                    { "productId": %d, "quantity": 1 }
                  ],
                  "totalCents": 650,
                  "paymentMethod": "PIX"
                }
                """.formatted(coxinha.getId());

        mockMvc.perform(post("/sales")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bothPayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").isNotEmpty());

        String neitherPayload = """
                {
                  "paymentMethod": "PIX"
                }
                """;

        mockMvc.perform(post("/sales")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(neitherPayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test
    void produtoInativoInexistenteEDeOutroUsuarioRetornam404() throws Exception {
        Product inactiveProduct = productRepository.save(new Product(loggedUser.getId(), "Kibe Inativo", 500, false));
        Product otherUserProduct = productRepository.save(new Product(otherUser.getId(), "Pastel Outro", 700, true));

        String inactivePayload = """
                {
                  "items": [{ "productId": %d, "quantity": 1 }],
                  "paymentMethod": "PIX"
                }
                """.formatted(inactiveProduct.getId());

        mockMvc.perform(post("/sales")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(inactivePayload))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").isNotEmpty());

        String nonExistentPayload = """
                {
                  "items": [{ "productId": 999999, "quantity": 1 }],
                  "paymentMethod": "PIX"
                }
                """;

        mockMvc.perform(post("/sales")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(nonExistentPayload))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").isNotEmpty());

        String otherUserPayload = """
                {
                  "items": [{ "productId": %d, "quantity": 1 }],
                  "paymentMethod": "PIX"
                }
                """.formatted(otherUserProduct.getId());

        mockMvc.perform(post("/sales")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(otherUserPayload))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test
    void quantityZeroRetorna400() throws Exception {
        String payload = """
                {
                  "items": [{ "productId": %d, "quantity": 0 }],
                  "paymentMethod": "DINHEIRO"
                }
                """.formatted(coxinha.getId());

        mockMvc.perform(post("/sales")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test
    void listarFiltraPorUsuarioLogadoDataNoFusoDeSaoPauloMetodoEStatus() throws Exception {
        // Venda de outro usuário (não deve aparecer)
        saleRepository.save(new Sale(
                otherUser.getId(),
                java.time.Instant.parse("2026-11-10T15:00:00Z"),
                1000,
                PaymentMethod.PIX,
                PaymentStatus.PAGO,
                null,
                null
        ));

        // Venda 1: 2026-11-10 às 23:59:59 em São Paulo (2026-11-11T02:59:59Z) -> pertence ao dia 2026-11-10 em SP
        mockMvc.perform(post("/sales")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "totalCents": 1000,
                                  "paymentMethod": "PIX",
                                  "paymentStatus": "PAGO",
                                  "soldAt": "2026-11-11T02:59:59Z"
                                }
                                """))
                .andExpect(status().isCreated());

        // Venda 2: 2026-11-11 às 00:00:00 em São Paulo (2026-11-11T03:00:00Z) -> pertence ao dia 2026-11-11 em SP
        mockMvc.perform(post("/sales")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "totalCents": 2000,
                                  "paymentMethod": "DINHEIRO",
                                  "paymentStatus": "PENDENTE",
                                  "soldAt": "2026-11-11T03:00:00Z"
                                }
                                """))
                .andExpect(status().isCreated());

        // Listagem geral (apenas as 2 do usuário logado, ordenadas por soldAt DESC)
        mockMvc.perform(get("/sales")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].totalCents").value(2000))
                .andExpect(jsonPath("$[1].totalCents").value(1000));

        // Filtro por data 2026-11-10 no fuso America/Sao_Paulo (deve incluir 23:59:59-03:00 e excluir 00:00:00-03:00 do dia 11)
        mockMvc.perform(get("/sales")
                        .param("from", "2026-11-10")
                        .param("to", "2026-11-10")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].totalCents").value(1000));

        // Filtro por paymentMethod=PIX
        mockMvc.perform(get("/sales")
                        .param("paymentMethod", "PIX")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].paymentMethod").value("PIX"));

        // Filtro por paymentStatus=PENDENTE
        mockMvc.perform(get("/sales")
                        .param("paymentStatus", "PENDENTE")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].paymentStatus").value("PENDENTE"));
    }

    @Test
    void deleteFazExclusaoLogicaSomeDaListagemEGetPorIdRetorna404() throws Exception {
        MvcResult createResult = mockMvc.perform(post("/sales")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "totalCents": 900,
                                  "paymentMethod": "DINHEIRO"
                                }
                                """))
                .andExpect(status().isCreated())
                .andReturn();

        Long saleId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .get("id")
                .asLong();

        mockMvc.perform(delete("/sales/" + saleId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/sales")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));

        mockMvc.perform(get("/sales/" + saleId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test
    void endpointsSemTokenRetornam401() throws Exception {
        mockMvc.perform(get("/sales"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/sales/1"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/sales")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"totalCents\":500,\"paymentMethod\":\"PIX\"}"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(delete("/sales/1"))
                .andExpect(status().isUnauthorized());
    }
}
