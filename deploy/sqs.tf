resource "aws_sqs_queue" "kaas-sqs" {
  name                      = "kaas-sqs"
  fifo_queue                  = true
  content_based_deduplication = true
  delay_seconds             = 90
  max_message_size          = 2048
  message_retention_seconds = 86400
  receive_wait_time_seconds = 10

  tags = {
    Environment = "kaas"
  }
}

