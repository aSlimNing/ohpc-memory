package com.bench.order;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;

class OrderServiceTest {

    @Test
    void createReturnsIncrementingIdOnHappyPath() {
        OrderService svc = new OrderService();
        assertEquals("ORD-1", svc.create("widget", 3));
        assertEquals("ORD-2", svc.create("gadget", 1));
    }

    @Test
    void createRejectsNonPositiveQty() {
        OrderService svc = new OrderService();
        assertThrows(IllegalArgumentException.class, () -> svc.create("gadget", 0));
        assertThrows(IllegalArgumentException.class, () -> svc.create("gadget", -1));
    }

    @Test
    void countIncrementsWithEachOrder() {
        OrderService svc = new OrderService();
        assertEquals(0, svc.count());
        svc.create("a", 1);
        assertEquals(1, svc.count());
        svc.create("b", 2);
        assertEquals(2, svc.count());
        assertEquals("ORD-3", svc.create("c", 5));
        assertEquals(3, svc.count());
    }
}
