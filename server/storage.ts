async createFreightRequest(insertRequest: InsertFreightRequest): Promise<FreightRequest> {
    try {
      // Obter o último número de pedido para este cliente
      const lastOrderNumber = await this.getLastClientOrderNumber(insertRequest.userId);
      const clientOrderNumber = lastOrderNumber + 1; // Incrementar 1 para o novo pedido
      
      // Usar a API do Drizzle ORM para inserção
      const [newRequest] = await db.insert(freightRequests).values({
        userId: insertRequest.userId,
        clientOrderNumber: clientOrderNumber, // Adicionar o número sequencial específico do cliente
        originCNPJ: insertRequest.originCNPJ || null,
        originCompanyName: insertRequest.originCompanyName || null,
        originStreet: insertRequest.originStreet,
        originCity: insertRequest.originCity,
        originState: insertRequest.originState,
        originZipCode: insertRequest.originZipCode || null,
        destinationCNPJ: insertRequest.destinationCNPJ || null,
        destinationCompanyName: insertRequest.destinationCompanyName || null,
        destinationStreet: insertRequest.destinationStreet,
        destinationCity: insertRequest.destinationCity,
        destinationState: insertRequest.destinationState,
        destinationZipCode: insertRequest.destinationZipCode || null,
        cargoType: insertRequest.cargoType,
        weight: insertRequest.weight,
        invoiceValue: insertRequest.invoiceValue,
        cargoDescription: insertRequest.cargoDescription || null,
        packageQuantity: insertRequest.packageQuantity || null,
        pickupDate: insertRequest.pickupDate,
        deliveryDate: insertRequest.deliveryDate,
        notes: insertRequest.notes || null,
        requireInsurance: insertRequest.requireInsurance || false,
        status: "pending",
      }).returning();
      
      // Retornar o objeto criado
      return newRequest;
    } catch (error) {
      console.error("Erro ao criar solicitação de frete:", error);
      throw error;
    }
  } 