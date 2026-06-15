package com.etamwonkam.backend.service;

import com.etamwonkam.backend.model.Vehicle;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.util.ArrayList;
import java.util.List;

@Service
public class FleetSimulatorService {

    private final SimpMessagingTemplate messagingTemplate;
    private final List<Vehicle> fleet = new ArrayList<>();

    public FleetSimulatorService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @PostConstruct
    public void initFleet() {
        fleet.add(new Vehicle("V-101", 38.9072, -77.0369, 45, "Active"));
        fleet.add(new Vehicle("V-102", 38.8951, -77.0366, 30, "Active"));
        fleet.add(new Vehicle("V-103", 38.9200, -77.0500, 0, "Delayed"));
    }

    @Scheduled(fixedRate = 2000)
    public void broadcastFleet() {
        for (Vehicle v : fleet) {
            if (!"Delayed".equals(v.getStatus())) {
                v.setLatitude(v.getLatitude() + 0.0005);
                v.setLongitude(v.getLongitude() + 0.0003);
            }
            messagingTemplate.convertAndSend("/topic/fleet", v);
        }
    }
}