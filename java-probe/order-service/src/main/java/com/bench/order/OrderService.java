package com.bench.order;

import java.util.ArrayList;
import java.util.List;

public class OrderService {
    private final List<String> orders = new ArrayList<>();

    public String create(String item, int qty) {
        if (qty <= 0) throw new IllegalArgumentException("qty must be positive");
        String id = "ORD-" + (orders.size() + 1);
        orders.add(id + ":" + item + "x" + qty);
        return id;
    }

    public int count() { return orders.size(); }
}
