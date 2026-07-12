package com.foro;

import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.ResponseEntity;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/chat")
// IMPORTANTE: Verifica que el puerto de Angular sea el 4200
@CrossOrigin(origins = "http://localhost:4200") 
public class ChatController {

    private final RestTemplate restTemplate = new RestTemplate();
    private final String MODERATION_API_URL = "http://localhost:8000/predict";

    @PostMapping("/send")
    public Map<String, String> processMessage(@RequestBody Map<String, String> payload) {
        String text = payload.getOrDefault("text", "");
        
        Map<String, String> requestBody = new HashMap<>();
        requestBody.put("text", text);
        
        try {
            ResponseEntity<Map> apiResponse = restTemplate.postForEntity(MODERATION_API_URL, requestBody, Map.class);
            Map<String, Object> responseBody = apiResponse.getBody();
            
            if (responseBody != null) {
                Boolean isToxic = (Boolean) responseBody.get("is_toxic");
                Double probability = (Double) responseBody.get("probability");
                String label = (String) responseBody.get("label");
                
                double rate = probability != null ? probability * 100 : 0.0;
                // Utilizamos el Locale por defecto o simplemente String.format
                String formattedRate = String.format("%.2f%%", rate);
                
                String replyMessage;
                // Si is_toxic es false o la etiqueta es NEUTRO
                if (Boolean.FALSE.equals(isToxic) || "NEUTRO".equalsIgnoreCase(label)) {
                    replyMessage = "Tu mensaje es positivo y muy sano gracias con el rate " + formattedRate;
                } else {
                    replyMessage = "Toxicidad detectada al " + formattedRate;
                }
                
                return Map.of("reply", replyMessage);
            }
        } catch (Exception e) {
            System.err.println("Error llamando a la API: " + e.getMessage());
            return Map.of("reply", "Error de conexión con la moderación.");
        }

        return Map.of("reply", "No se pudo analizar el mensaje.");
    }
}