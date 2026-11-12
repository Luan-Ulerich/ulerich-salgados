package com.ulerich.salgados.summary;

import com.ulerich.salgados.TestcontainersConfiguration;
import com.ulerich.salgados.product.Product;
import com.ulerich.salgados.product.ProductRepository;
import com.ulerich.salgados.sale.PaymentMethod;
import com.ulerich.salgados.sale.PaymentStatus;
import com.ulerich.salgados.sale.Sale;
import com.ulerich.salgados.sale.SaleItem;
import com.ulerich.salgados.sale.SaleRepository;
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
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
class SummaryIntegrationTest {

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

    @BeforeEach
    void setUp() throws Exception {
        this.mockMvc = MockMvcBuilders.webAppContextSetup(context)
                .apply(springSecurity())
                .build();

        saleRepository.deleteAll();
        productRepository.deleteAll();
        userRepository.deleteAll();

        loggedUser = userRepository.save(new User(
                "Resumo User",
                "resumo@salgados.com",
                passwordEncoder.encode("senha123")
        ));

        otherUser = userRepository.save(new User(
                "Outro User",
                "outro@salgados.com",
                passwordEncoder.encode("senha123")
        ));

        String loginPayload = """
                {
                  "email": "resumo@salgados.com",
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
    void resumoDoDiaCalculaTotaisFormasDePagamentoPendentesDeletadasEOutroUsuario() throws Exception {
        Instant soldAtDay = Instant.parse("2026-11-12T15:00:00Z"); // 12:00 em São Paulo

        // 1) Venda PAGO em PIX (1500)
        saleRepository.save(new Sale(
                loggedUser.getId(),
                soldAtDay,
                1500L,
                PaymentMethod.PIX,
                PaymentStatus.PAGO,
                null,
                null
        ));

        // 2) Duas vendas PAGO em DINHEIRO (800 + 700 = 1500)
        saleRepository.save(new Sale(
                loggedUser.getId(),
                soldAtDay,
                800L,
                PaymentMethod.DINHEIRO,
                PaymentStatus.PAGO,
                null,
                null
        ));
        saleRepository.save(new Sale(
                loggedUser.getId(),
                soldAtDay,
                700L,
                PaymentMethod.DINHEIRO,
                PaymentStatus.PAGO,
                null,
                null
        ));

        // 3) Venda PENDENTE em CARTAO (2000) -> não entra em totalCents, entra em pendingCents
        saleRepository.save(new Sale(
                loggedUser.getId(),
                soldAtDay,
                2000L,
                PaymentMethod.CARTAO,
                PaymentStatus.PENDENTE,
                null,
                null
        ));

        // 4) Venda deletada (deleted_at preenchido) -> não entra em nada
        Sale deletedSale = new Sale(
                loggedUser.getId(),
                soldAtDay,
                5000L,
                PaymentMethod.PIX,
                PaymentStatus.PAGO,
                null,
                null
        );
        deletedSale.setDeletedAt(Instant.now());
        saleRepository.save(deletedSale);

        // 5) Venda de outro usuário -> não entra em nada
        saleRepository.save(new Sale(
                otherUser.getId(),
                soldAtDay,
                9000L,
                PaymentMethod.PIX,
                PaymentStatus.PAGO,
                null,
                null
        ));

        mockMvc.perform(get("/summary/day")
                        .param("date", "2026-11-12")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.date").value("2026-11-12"))
                .andExpect(jsonPath("$.totalCents").value(3000))
                .andExpect(jsonPath("$.salesCount").value(3))
                .andExpect(jsonPath("$.pendingCents").value(2000))
                .andExpect(jsonPath("$.pendingCount").value(1))
                .andExpect(jsonPath("$.byPaymentMethod", hasSize(3)))
                .andExpect(jsonPath("$.byPaymentMethod[0].paymentMethod").value("DINHEIRO"))
                .andExpect(jsonPath("$.byPaymentMethod[0].totalCents").value(1500))
                .andExpect(jsonPath("$.byPaymentMethod[0].count").value(2))
                .andExpect(jsonPath("$.byPaymentMethod[1].paymentMethod").value("PIX"))
                .andExpect(jsonPath("$.byPaymentMethod[1].totalCents").value(1500))
                .andExpect(jsonPath("$.byPaymentMethod[1].count").value(1))
                .andExpect(jsonPath("$.byPaymentMethod[2].paymentMethod").value("CARTAO"))
                .andExpect(jsonPath("$.byPaymentMethod[2].totalCents").value(0))
                .andExpect(jsonPath("$.byPaymentMethod[2].count").value(0));
    }

    @Test
    void vendaAs23h30DeSaoPauloEntraNoDiaEA00h30DoDiaSeguinteNao() throws Exception {
        // 2026-11-12 23:30:00 America/Sao_Paulo (-03:00) = 2026-11-13T02:30:00Z
        Instant sp2330 = Instant.parse("2026-11-13T02:30:00Z");
        // 2026-11-13 00:30:00 America/Sao_Paulo (-03:00) = 2026-11-13T03:30:00Z
        Instant spNextDay0030 = Instant.parse("2026-11-13T03:30:00Z");

        saleRepository.save(new Sale(
                loggedUser.getId(),
                sp2330,
                1200L,
                PaymentMethod.PIX,
                PaymentStatus.PAGO,
                null,
                null
        ));

        saleRepository.save(new Sale(
                loggedUser.getId(),
                spNextDay0030,
                3400L,
                PaymentMethod.PIX,
                PaymentStatus.PAGO,
                null,
                null
        ));

        mockMvc.perform(get("/summary/day")
                        .param("date", "2026-11-12")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.date").value("2026-11-12"))
                .andExpect(jsonPath("$.totalCents").value(1200))
                .andExpect(jsonPath("$.salesCount").value(1));
    }

    @Test
    void resumoDoMesRetornaByDayCompletoSomaCorretaETopProductsOrdenados() throws Exception {
        Product p1 = productRepository.save(new Product(loggedUser.getId(), "Coxinha", 600, true));
        Product p2 = productRepository.save(new Product(loggedUser.getId(), "Risole", 500, true));
        Product p3 = productRepository.save(new Product(loggedUser.getId(), "Kibe", 550, true));

        // Venda no dia 2026-11-05 (10:00 SP = 13:00Z): 5 Risoles (2500) + 2 Coxinhas (1200) = 3700
        Sale sale1 = new Sale(
                loggedUser.getId(),
                Instant.parse("2026-11-05T13:00:00Z"),
                3700L,
                PaymentMethod.PIX,
                PaymentStatus.PAGO,
                null,
                null
        );
        sale1.addItem(new SaleItem(p2.getId(), p2.getName(), p2.getPriceCents(), 5));
        sale1.addItem(new SaleItem(p1.getId(), p1.getName(), p1.getPriceCents(), 2));
        saleRepository.save(sale1);

        // Venda no dia 2026-11-20 às 23:30 SP (2026-11-21T02:30:00Z): 4 Kibes (2200)
        Sale sale2 = new Sale(
                loggedUser.getId(),
                Instant.parse("2026-11-21T02:30:00Z"),
                2200L,
                PaymentMethod.DINHEIRO,
                PaymentStatus.PAGO,
                null,
                null
        );
        sale2.addItem(new SaleItem(p3.getId(), p3.getName(), p3.getPriceCents(), 4));
        saleRepository.save(sale2);

        // Venda rápida no dia 2026-11-20 (sem itens): 1000
        saleRepository.save(new Sale(
                loggedUser.getId(),
                Instant.parse("2026-11-20T15:00:00Z"),
                1000L,
                PaymentMethod.CARTAO,
                PaymentStatus.PAGO,
                null,
                null
        ));

        // Venda PENDENTE com itens (não deve entrar em topProducts nem em byDay/totalCents)
        Sale pendingSale = new Sale(
                loggedUser.getId(),
                Instant.parse("2026-11-10T15:00:00Z"),
                6000L,
                PaymentMethod.PIX,
                PaymentStatus.PENDENTE,
                null,
                null
        );
        pendingSale.addItem(new SaleItem(p1.getId(), p1.getName(), p1.getPriceCents(), 10));
        saleRepository.save(pendingSale);

        MvcResult result = mockMvc.perform(get("/summary/month")
                        .param("month", "2026-11")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.month").value("2026-11"))
                .andExpect(jsonPath("$.totalCents").value(6900))
                .andExpect(jsonPath("$.salesCount").value(3))
                .andExpect(jsonPath("$.pendingCents").value(6000))
                .andExpect(jsonPath("$.pendingCount").value(1))
                .andExpect(jsonPath("$.byDay", hasSize(30)))
                .andExpect(jsonPath("$.byDay[4].date").value("2026-11-05"))
                .andExpect(jsonPath("$.byDay[4].totalCents").value(3700))
                .andExpect(jsonPath("$.byDay[4].count").value(1))
                .andExpect(jsonPath("$.byDay[19].date").value("2026-11-20"))
                .andExpect(jsonPath("$.byDay[19].totalCents").value(3200))
                .andExpect(jsonPath("$.byDay[19].count").value(2))
                .andExpect(jsonPath("$.topProducts", hasSize(3)))
                .andExpect(jsonPath("$.topProducts[0].name").value("Risole"))
                .andExpect(jsonPath("$.topProducts[0].quantity").value(5))
                .andExpect(jsonPath("$.topProducts[0].totalCents").value(2500))
                .andExpect(jsonPath("$.topProducts[1].name").value("Kibe"))
                .andExpect(jsonPath("$.topProducts[1].quantity").value(4))
                .andExpect(jsonPath("$.topProducts[1].totalCents").value(2200))
                .andExpect(jsonPath("$.topProducts[2].name").value("Coxinha"))
                .andExpect(jsonPath("$.topProducts[2].quantity").value(2))
                .andExpect(jsonPath("$.topProducts[2].totalCents").value(1200))
                .andReturn();

        JsonNode root = objectMapper.readTree(result.getResponse().getContentAsString());
        long sumByDay = 0L;
        for (JsonNode dayNode : root.get("byDay")) {
            sumByDay += dayNode.get("totalCents").asLong();
        }
        assertThat(sumByDay).isEqualTo(root.get("totalCents").asLong());
    }

    @Test
    void mesSemVendasRetornaTudoZeradoEByDayCompleto() throws Exception {
        mockMvc.perform(get("/summary/month")
                        .param("month", "2026-02")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.month").value("2026-02"))
                .andExpect(jsonPath("$.totalCents").value(0))
                .andExpect(jsonPath("$.salesCount").value(0))
                .andExpect(jsonPath("$.pendingCents").value(0))
                .andExpect(jsonPath("$.pendingCount").value(0))
                .andExpect(jsonPath("$.byPaymentMethod", hasSize(3)))
                .andExpect(jsonPath("$.byDay", hasSize(28)))
                .andExpect(jsonPath("$.topProducts", hasSize(0)));
    }

    @Test
    void dateEMonthInvalidosRetornam400ESemTokenRetorna401() throws Exception {
        mockMvc.perform(get("/summary/day")
                        .param("date", "2026-99-99")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").isNotEmpty());

        mockMvc.perform(get("/summary/month")
                        .param("month", "invalido")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").isNotEmpty());

        mockMvc.perform(get("/summary/day"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/summary/month"))
                .andExpect(status().isUnauthorized());
    }
}
