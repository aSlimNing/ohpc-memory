package com.bench.order;

public class Main {
    public static void main(String[] args) {
        OrderService svc = new OrderService();
        String id = svc.create("widget", 3);
        System.out.println("created " + id + ", total=" + svc.count());
    }
}
