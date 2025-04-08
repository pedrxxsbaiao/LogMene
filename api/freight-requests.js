// Criar nova solicitação de frete
case '/create':
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }
    
  // Verificar se é um cliente
  if (!checkUserRole(user, 'client')) {
    return res.status(403).json({ error: 'Acesso negado' });
  }
    
  try {
    const requestData = {
      ...req.body,
      userId: user.id,
      status: 'pending',
      createdAt: new Date()
    };
      
    // Inserir solicitação
    const [request] = await db.insert(freightRequests)
      .values(requestData)
      .returning();
        
    return res.status(201).json(request);
  } catch (error) {
    console.error('Erro ao criar solicitação:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  } 