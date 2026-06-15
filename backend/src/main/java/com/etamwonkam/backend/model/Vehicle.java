package com.etamwonkam.backend.model; // ⚠️ Again, check your path

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class Vehicle {
    private String vehicleId;
    private double latitude;
    private double longitude;
    private int speedMph;
    private String status; // e.g., "Active", "Delayed"
}