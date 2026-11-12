package com.ulerich.salgados.product;

import com.ulerich.salgados.TestcontainersConfiguration;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
class ProductIntegrationTest {

    @Autowired
    private WebApplicationContext context;

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

        productRepository.deleteAll();
        userRepository.deleteAll();

        loggedUser = userRepository.save(new User(
                "João Salgados",
                "joao@salgados.com",
                passwordEncoder.encode("senha123")
        ));

        otherUser = userRepository.save(new User(
                "Outro Usuário",
                "outro@salgados.com",
                passwordEncoder.encode("senha123")
        ));

        String loginPayload = """
                {
                  "email": "joao@salgados.com",
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
        productRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void criarProdutoRetorna201ComProdutoCriado() throws Exception {
        String payload = """
                {
                  "name": "Coxinha de Frango",
                  "priceCents": 650
                }
                """;

        mockMvc.perform(post("/products")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.name").value("Coxinha de Frango"))
                .andExpect(jsonPath("$.priceCents").value(650))
                .andExpect(jsonPath("$.active").value(true))
                .andExpect(jsonPath("$.createdAt").isNotEmpty());
    }

    @Test
    void listarRetornaSoOsProdutosDoUsuarioLogadoOrdenadosPorNome() throws Exception {
        productRepository.save(new Product(loggedUser.getId(), "Risole", 600, true));
        productRepository.save(new Product(loggedUser.getId(), "Coxinha", 650, true));
        productRepository.save(new Product(otherUser.getId(), "Empada de Outro Usuário", 700, true));

        mockMvc.perform(get("/products")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].name").value("Coxinha"))
                .andExpect(jsonPath("$[1].name").value("Risole"));
    }

    @Test
    void listarComFiltroActiveTrueRetornaApenasAtivos() throws Exception {
        productRepository.save(new Product(loggedUser.getId(), "Kibe Ativo", 550, true));
        productRepository.save(new Product(loggedUser.getId(), "Pastel Inativo", 800, false));

        mockMvc.perform(get("/products")
                        .param("active", "true")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].name").value("Kibe Ativo"))
                .andExpect(jsonPath("$[0].active").value(true));
    }

    @Test
    void atualizarPrecoEStatusDoProduto() throws Exception {
        Product product = productRepository.save(new Product(loggedUser.getId(), "Enroladinho", 500, true));

        String payload = """
                {
                  "name": "Enroladinho de Salsicha",
                  "priceCents": 600,
                  "active": false
                }
                """;

        mockMvc.perform(put("/products/" + product.getId())
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(product.getId()))
                .andExpect(jsonPath("$.name").value("Enroladinho de Salsicha"))
                .andExpect(jsonPath("$.priceCents").value(600))
                .andExpect(jsonPath("$.active").value(false));
    }

    @Test
    void putEmProdutoDeOutroUsuarioRetorna404() throws Exception {
        Product otherProduct = productRepository.save(new Product(otherUser.getId(), "Esfiha", 700, true));

        String payload = """
                {
                  "name": "Esfiha Alterada",
                  "priceCents": 100,
                  "active": true
                }
                """;

        mockMvc.perform(put("/products/" + otherProduct.getId())
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test
    void endpointsSemTokenRetornam401() throws Exception {
        mockMvc.perform(get("/products"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Coxinha\",\"priceCents\":500}"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(put("/products/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Coxinha\",\"priceCents\":500,\"active\":true}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void nomeVazioEPriceCentsNegativoRetornam400() throws Exception {
        String emptyNamePayload = """
                {
                  "name": "   ",
                  "priceCents": 500
                }
                """;

        mockMvc.perform(post("/products")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(emptyNamePayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").isNotEmpty());

        String negativePricePayload = """
                {
                  "name": "Coxinha",
                  "priceCents": -10
                }
                """;

        mockMvc.perform(post("/products")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(negativePricePayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").isNotEmpty());
    }
}
